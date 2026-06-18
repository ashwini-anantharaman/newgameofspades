import { Card, GameState, Play, Seat, rankValue } from "./types";

export function isVoidIn(hand: Card[], suit: string): boolean {
  return !hand.some((c) => c.suit === suit);
}

/** Legal cards a seat may play given the current trick state. */
export function legalMoves(state: GameState, seat: Seat): Card[] {
  const hand = state.hands[seat];
  if (hand.length === 0) return [];

  // Leading the trick.
  if (state.trick.length === 0) {
    const nonSpades = hand.filter((c) => c.suit !== "spades");
    // Cannot lead spades until broken, unless only spades remain.
    if (!state.spadesBroken && nonSpades.length > 0) return nonSpades;
    return hand.slice();
  }

  // Following: must follow led suit if able.
  const led = state.ledSuit!;
  const inSuit = hand.filter((c) => c.suit === led);
  if (inSuit.length > 0) return inSuit;
  return hand.slice(); // void in led suit -> anything (incl. spades)
}

export function isLegal(state: GameState, seat: Seat, card: Card): boolean {
  return legalMoves(state, seat).some((c) => c.suit === card.suit && c.rank === card.rank);
}

/** Winner of a completed (or partial) trick. */
export function trickWinner(trick: Play[], ledSuit: string): Seat {
  const spades = trick.filter((p) => p.card.suit === "spades");
  const pool = spades.length > 0 ? spades : trick.filter((p) => p.card.suit === ledSuit);
  return pool.reduce((best, p) =>
    rankValue(p.card.rank) > rankValue(best.card.rank) ? p : best
  ).seat;
}

/** Who is currently winning a partial trick (or null if empty). */
export function currentWinner(state: GameState): Seat | null {
  if (state.trick.length === 0) return null;
  return trickWinner(state.trick, state.ledSuit!);
}
