import { GameState, Seat, Card, sameCard } from "../engine/types";
import { evaluateMoves, MoveEval } from "../engine/evaluate";
import { Observation } from "./profile";
import { misconceptionForTag, MISCONCEPTIONS } from "./misconceptions";

export type PlayMode = "Guided" | "Hard" | "Solo";

/** @deprecated use PlayMode */
export type Intensity = PlayMode | "Quiet" | "Balanced" | "Chatty";

export const PLAY_MODE_META: Record<PlayMode, { phase: number; title: string; blurb: string }> = {
  Guided: { phase: 1, title: "Guided", blurb: "Hints + coach quizzes on every decision" },
  Hard: { phase: 2, title: "Hard", blurb: "Tougher questions — minimal hints, more choices" },
  Solo: { phase: 3, title: "Solo", blurb: "Play vs AI only — no quizzes" },
};

export function usesCoachQuiz(mode: PlayMode): boolean {
  return mode === "Guided" || mode === "Hard";
}
export type CoachMode = "bid" | "prehint" | "reflect" | "teachable";

const THRESHOLD: Record<PlayMode, number> = { Guided: 0.22, Hard: 0.18, Solo: 0.35 };

/** Wrong tries before the engine names the best card / full rationale. */
export const REVEAL_AFTER_ATTEMPTS = 3;

export function gentleWrongMoveMessage(misconceptionId?: string): string {
  if (misconceptionId && MISCONCEPTIONS[misconceptionId]) {
    const line = MISCONCEPTIONS[misconceptionId].explain.split(".")[0];
    return `Not quite — ${line}.`;
  }
  return "Not quite — look at the trick and your hand again.";
}

export function gentleWorkflowWrongMessage(attemptsLeft: number): string {
  if (attemptsLeft <= 0) return "";
  const n = attemptsLeft === 1 ? "1 try" : `${attemptsLeft} tries`;
  return `Not quite — try another option. (${n} before I spell it out.)`;
}

export interface CoachDecision {
  coach: boolean;
  mode: CoachMode;
  reason: string;
}

/** Should the coach speak before the human plays? Reflection-first: stay quiet
 *  unless there's a real fork or a likely blunder. */
export function shouldCoachPre(
  state: GameState, seat: Seat, mode: PlayMode, weakNodes: string[]
): CoachDecision {
  if (mode === "Solo") return { coach: false, mode: "prehint", reason: "" };
  if (state.phase === "bidding") return { coach: true, mode: "bid", reason: "bidding decision" };
  const evals = evaluateMoves(state, seat);
  if (evals.length <= 1) return { coach: false, mode: "prehint", reason: "forced move" };
  const best = evals[0];
  const spread = best.score - evals[evals.length - 1].score;
  const touchesWeakArea = best.nodeIds.some((n) => weakNodes.includes(n));
  const fork = spread >= THRESHOLD[mode];
  if (fork && (mode === "Guided" || touchesWeakArea)) {
    return { coach: true, mode: "prehint", reason: "meaningful choice in a focus area" };
  }
  return { coach: false, mode: "prehint", reason: "let them try" };
}

export interface MoveAnalysis {
  chosen: MoveEval;
  best: MoveEval;
  correct: boolean;     // chose a (near-)best move
  observation: Observation;
  message: string;      // deterministic coach line (fallback / offline)
  askWhy: boolean;      // post-move probing question on a weak move
}

/** Analyse the human's played card against ground truth and produce an
 *  observation + a deterministic coaching message. */
export function analyzeMove(
  state: GameState, seat: Seat, played: Card, prompted: boolean, wrongAttempt = 1,
): MoveAnalysis {
  const evals = evaluateMoves(state, seat);
  const chosen = evals.find((e) => sameCard(e.card, played)) ?? evals[0];
  const best = evals[0];
  const correct = chosen.score >= best.score - 0.15;

  const misId = !correct ? chosen.tags.map(misconceptionForTag).find(Boolean) : undefined;
  const nodeIds = chosen.nodeIds.length ? chosen.nodeIds : best.nodeIds;

  const observation: Observation = { nodeIds, correct, prompted, misconceptionId: misId, note: chosen.rationale };

  const reveal = correct || wrongAttempt >= REVEAL_AFTER_ATTEMPTS;
  let message: string;
  if (correct) {
    message = `Good — ${chosen.rationale.toLowerCase()}`;
  } else if (reveal) {
    const better = best.card;
    message = `Try the ${better.rank} of ${better.suit} instead — ${best.rationale.toLowerCase()}`;
  } else {
    message = gentleWrongMoveMessage(misId);
  }

  return { chosen, best, correct, observation, message, askWhy: !correct && reveal };
}

/** Bid coaching: compare the human's bid to the evaluator. */
export function analyzeBid(handEval: { suggested: number }, bid: number | "nil"): { message: string; observation: Observation } {
  const nodeIds = ["count_bid", "bid_basics"];
  if (bid === "nil") {
    return { message: "Nil is a bold call — zero tricks all round. Make sure your hand has no surprise winners.", observation: { nodeIds: ["nil"], correct: true, prompted: false } };
  }
  const diff = bid - handEval.suggested;
  let message: string, correct = Math.abs(diff) <= 1;
  if (Math.abs(diff) <= 1) message = `Reasonable bid. I counted about ${handEval.suggested} likely tricks too.`;
  else if (diff > 1) message = `That's ambitious — I count closer to ${handEval.suggested}. Over-bidding risks getting set (−10 a trick).`;
  else message = `A little cautious — I count about ${handEval.suggested}. Under-bidding leaves points (and bags) on the table.`;
  return { message, observation: { nodeIds, correct, prompted: false, misconceptionId: correct ? undefined : "bids_by_card_count_not_winners" } };
}

/**
 * LLM seam. The deterministic `analysis.message` always works offline.
 * To use a real Claude coach, POST the context below to your own server route
 * (never call the API from the browser with a key) and stream the reply.
 * The engine evaluation is passed in as GROUND TRUTH — the model teaches to it,
 * it does not rank moves itself.
 */
export interface CoachContext {
  phase: string;
  hand: Card[];
  trick: { seat: Seat; card: Card }[];
  ledSuit: string | null;
  bids: Record<Seat, number | "nil" | null>;
  evals: MoveEval[];
  chosen?: Card;
  weakNodes: string[];
  mode: CoachMode;
  recent: string[];
}

export function buildCoachContext(
  state: GameState, seat: Seat, mode: CoachMode, weakNodes: string[], recent: string[], chosen?: Card
): CoachContext {
  return {
    phase: state.phase,
    hand: state.hands[seat],
    trick: state.trick,
    ledSuit: state.ledSuit,
    bids: state.bids,
    evals: evaluateMoves(state, seat),
    chosen,
    weakNodes,
    mode,
    recent,
  };
}
