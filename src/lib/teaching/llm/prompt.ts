import { CoachRequest } from "./protocol";
import type { Card } from "../../engine/types";

const SUIT_SYM: Record<string, string> = { spades: "\u2660", hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663" };
const card = (c: Card) => `${c.rank}${SUIT_SYM[c.suit]}`;
const cards = (cs: Card[]) => cs.map(card).join(" ");

export function buildSystemPrompt(req: CoachRequest): string {
  const focus = req.weakNodes.length ? `\nThe learner is currently working on: ${req.weakNodes.join(", ")}. When relevant, steer your comment toward these.` : "";
  return [
    "You are a warm Spades tutor for a beginner.",
    "",
    "GROUND TRUTH: Trust the engine evaluation completely. Never rank moves yourself or disagree with [BEST].",
    "",
    "Voice — strict limits:",
    "- Max 2 short sentences, ~25 words total. Plain language.",
    "- At most one brief question, or none.",
    "- Good move: one specific praise line.",
    "- Weak move: name the better card + one reason. No lecture.",
    "- Never restate rules unless asked. Never reference unseen cards.",
    focus,
  ].filter(Boolean).join("\n");
}

export function buildUserContent(req: CoachRequest): string {
  const lines: string[] = [];
  lines.push(`Phase: ${req.phase}`);
  lines.push(`Your hand: ${cards(req.hand)}`);
  if (req.trick.length) lines.push(`Trick so far (led ${req.ledSuit}): ${req.trick.map((p) => `${p.seat} ${card(p.card)}`).join(", ")}`);
  lines.push(`Bids: ${Object.entries(req.bids).map(([s, b]) => `${s}=${b ?? "?"}`).join(" ")}`);
  if (req.scoreLine) lines.push(req.scoreLine);

  lines.push("");
  lines.push("Engine evaluation of your legal moves (best first):");
  for (const e of req.evals.slice(0, 6)) {
    lines.push(`  ${card(e.card)}  score ${e.score.toFixed(2)}${e.best ? " [BEST]" : ""}${e.weak ? " [weak]" : ""} — ${e.rationale}`);
  }

  if (req.verdict) {
    const v = req.verdict;
    lines.push("");
    lines.push(`Learner played ${card(v.chosen)} — engine verdict: ${v.correct ? "good (near-best)" : "suboptimal"}.`);
    lines.push(`Engine's best was ${card(v.best)} (${v.bestRationale}).`);
  }

  if (req.recent.length) {
    lines.push("");
    lines.push("Recent conversation:");
    for (const r of req.recent.slice(-4)) lines.push(`  ${r}`);
  }

  lines.push("");
  switch (req.kind) {
    case "coach":
      if (req.mode === "bid") lines.push("Task: one line on their bid vs engine count. Optional one short question.");
      else if (req.verdict) lines.push("Task: react to their move in 1-2 sentences max.");
      else lines.push("Task: light nudge or one question. Do not give the answer.");
      break;
    case "ask":
      lines.push(`The learner asks: "${req.question}"`);
      lines.push("Task: answer in 1-2 sentences using engine eval.");
      break;
    case "briefing":
      lines.push("Task: one encouraging sentence on what to focus on this game.");
      break;
  }
  return lines.join("\n");
}
