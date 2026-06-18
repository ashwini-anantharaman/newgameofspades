import Anthropic from "@anthropic-ai/sdk";
import { LESSONS } from "../../src/lib/store/content";
import { nodeById } from "../../src/lib/teaching/skillTree";
import { scenariosForNode } from "../../src/lib/teaching/scenarioGen";
import type { Lesson, LessonStep, Scenario } from "../../src/lib/store/content";
import type { Card, Seat, Suit, Rank } from "../../src/lib/engine/types";
import { DEMO_KEYS, LessonRequest, ScenarioRequest } from "../../src/lib/teaching/content/protocol";
import { buildLessonPrompt, buildScenarioPrompt } from "../../src/lib/teaching/content/prompt";
import { COACH_MODEL, CONTENT_MAX_TOKENS } from "../../src/lib/teaching/llm/protocol";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const RANKS = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]);
const SUITS = new Set(["spades", "hearts", "diamonds", "clubs"]);
const SEATS = new Set(["N", "E", "S", "W"]);

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

function validDemo(d: string): string {
  return (DEMO_KEYS as readonly string[]).includes(d) ? d : "normalTrick";
}

function parseLesson(nodeId: string, text: string, fallback: Lesson): { lesson: Lesson; fromAi: boolean } {
  try {
    const data = extractJson(text) as { steps?: LessonStep[] };
    const steps = (data.steps ?? []).filter((s) => s?.heading && s?.body).map((s) => ({
      heading: String(s.heading),
      body: String(s.body),
      takeaway: String(s.takeaway ?? s.body),
      demo: validDemo(String(s.demo ?? "normalTrick")),
    }));
    if (steps.length < 1) return { lesson: fallback, fromAi: false };
    return { lesson: { nodeId, title: fallback.title, steps }, fromAi: true };
  } catch {
    return { lesson: fallback, fromAi: false };
  }
}

function parseCard(c: unknown): Card | null {
  if (!c || typeof c !== "object") return null;
  const o = c as { rank?: string; suit?: string };
  if (!o.rank || !o.suit || !RANKS.has(o.rank) || !SUITS.has(o.suit)) return null;
  return { rank: o.rank as Rank, suit: o.suit as Suit };
}

function parseScenario(nodeId: string, text: string, fallback: Scenario): { scenario: Scenario; fromAi: boolean } {
  try {
    const data = extractJson(text) as Partial<Scenario>;
    const hand = (data.hand ?? []).map(parseCard).filter(Boolean) as Card[];
    const trick = (data.trick ?? [])
      .map((t) => {
        const card = parseCard((t as { card?: unknown }).card);
        const seat = (t as { seat?: string }).seat;
        if (!card || !seat || !SEATS.has(seat)) return null;
        return { seat: seat as Seat, card };
      })
      .filter(Boolean) as Scenario["trick"];
    const correctCards = (data.correctCards ?? []).map(parseCard).filter(Boolean) as Card[];
    if (!hand.length || !correctCards.length || !data.prompt) return { scenario: fallback, fromAi: false };
    const led = data.ledSuit;
    const ledSuit = led === null || led === undefined ? null : SUITS.has(String(led)) ? (String(led) as Suit) : fallback.ledSuit;
    return {
      scenario: {
        id: String(data.id ?? `${nodeId}-ai`),
        nodeId,
        difficulty: ([1, 2, 3].includes(Number(data.difficulty)) ? Number(data.difficulty) : fallback.difficulty) as 1 | 2 | 3,
        prompt: String(data.prompt),
        hand,
        trick,
        ledSuit,
        bids: (data.bids as Scenario["bids"]) ?? fallback.bids,
        spadesBroken: Boolean(data.spadesBroken),
        correctCards,
        explainCorrect: String(data.explainCorrect ?? fallback.explainCorrect),
      },
      fromAi: true,
    };
  } catch {
    return { scenario: fallback, fromAi: false };
  }
}

export async function generateLesson(req: LessonRequest): Promise<{ lesson: Lesson; source: "ai" | "static" }> {
  const fallback: Lesson = LESSONS[req.nodeId] ?? {
    nodeId: req.nodeId,
    title: req.title,
    steps: [{ heading: req.title, body: req.blurb, takeaway: req.blurb, demo: "normalTrick" }],
  };

  try {
    const msg = await client().messages.create({
      model: COACH_MODEL,
      max_tokens: CONTENT_MAX_TOKENS,
      system: "You write concise Spades teaching content. Output only valid JSON.",
      messages: [{ role: "user", content: buildLessonPrompt(req) }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const { lesson, fromAi } = parseLesson(req.nodeId, text, fallback);
    return { lesson, source: fromAi ? "ai" : "static" };
  } catch {
    return { lesson: fallback, source: "static" };
  }
}

export async function generateScenario(req: ScenarioRequest): Promise<{ scenario: Scenario; source: "ai" | "static" }> {
  const pool = scenariosForNode(req.nodeId);
  const fallback =
    pool.find((s) => s.difficulty === req.difficulty) ??
    pool[0];
  if (!fallback) throw new Error(`no fallback scenario for ${req.nodeId}`);

  try {
    const msg = await client().messages.create({
      model: COACH_MODEL,
      max_tokens: CONTENT_MAX_TOKENS,
      system: "You create Spades practice drills. Output only valid JSON.",
      messages: [{ role: "user", content: buildScenarioPrompt(req) }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const { scenario, fromAi } = parseScenario(req.nodeId, text, fallback);
    return { scenario, source: fromAi ? "ai" : "static" };
  } catch {
    return { scenario: fallback, source: "static" };
  }
}
