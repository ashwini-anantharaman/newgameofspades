import type { Action, GameState, Seat } from "./types";
import { stepAdvance } from "./gameState";

const SEAT_LABEL: Record<Seat, string> = {
  N: "North (partner)",
  E: "East",
  W: "West",
  S: "You",
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PACE_MS = 1400;
const HOLD_MS = 700;

function pendingLabel(event: Action): string {
  if (event.type === "BID") return `${SEAT_LABEL[event.seat]} is bidding…`;
  return `${SEAT_LABEL[event.seat]} is playing now…`;
}

/** Step through AI seats with delays; label shows before the card lands. */
export async function animateAdvance(
  start: GameState,
  human: Seat,
  onStep: (state: GameState, label: string | null) => void,
  paceMs = PACE_MS,
  holdMs = HOLD_MS,
): Promise<GameState> {
  let state = start;
  while (true) {
    const { state: next, event } = stepAdvance(state, human);
    if (!event) break;
    onStep(state, pendingLabel(event));
    await delay(paceMs);
    onStep(next, resultLabel(event));
    state = next;
    await delay(holdMs);
  }
  onStep(state, null);
  return state;
}

function resultLabel(event: Action): string {
  if (event.type === "BID") {
    const b = event.bid === "nil" ? "nil" : String(event.bid);
    return `${SEAT_LABEL[event.seat]} bid ${b}`;
  }
  const sym = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[event.card.suit];
  return `${SEAT_LABEL[event.seat]} played ${event.card.rank}${sym}`;
}

export { SEAT_LABEL };
