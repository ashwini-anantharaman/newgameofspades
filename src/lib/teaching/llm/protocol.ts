// Model + limits. Override COACH_MODEL via env on the server.
// Check Anthropic's docs for the current fast model id before shipping.
export const COACH_MODEL = (typeof process !== "undefined" && process.env?.COACH_MODEL) || "claude-sonnet-4-6";
export const MAX_TOKENS = 96; // side panel: one or two short sentences only
export const CONTENT_MAX_TOKENS = 1200; // lessons/scenarios need full JSON

// What the client POSTs to /api/coach.
export type CoachKind = "coach" | "ask" | "briefing";

import type { Card, Seat } from "../../engine/types";
import type { MoveEval } from "../../engine/evaluate";

export interface CoachVerdict {
  chosen: Card;
  best: Card;
  correct: boolean;
  chosenRationale: string;
  bestRationale: string;
}

export interface CoachRequest {
  kind: CoachKind;
  mode?: "bid" | "prehint" | "reflect" | "teachable";
  // compact game context
  phase: string;
  hand: Card[];
  trick: { seat: Seat; card: Card }[];
  ledSuit: string | null;
  bids: Record<Seat, number | "nil" | null>;
  scoreLine?: string;               // e.g. "You: 3 tricks, bid 4 (need 1 more), 2 bags"
  evals: MoveEval[];                // engine ground truth
  verdict?: CoachVerdict;           // for kind:"coach" reflect/teachable
  weakNodes: string[];              // focus areas (Game 2 adaptivity)
  recent: string[];                 // last few coach/user lines
  question?: string;                // for kind:"ask"
}

// Server -> client stream events (SSE-style JSON lines).
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
