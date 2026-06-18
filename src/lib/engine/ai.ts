import { Card, GameState, Seat, Bid, rankValue, partnerOf, SUITS } from "./types";
import { legalMoves, currentWinner, trickWinner } from "./rules";
import { teamOf } from "./types";

/** Estimate likely tricks from a hand and return a bid. */
export function aiBid(hand: Card[]): Bid {
  let pts = 0;
  for (const suit of SUITS) {
    const cards = hand.filter((c) => c.suit === suit);
    const has = (r: string) => cards.some((c) => c.rank === r);
    if (suit === "spades") {
      if (has("A")) pts += 1;
      if (has("K")) pts += 0.9;
      if (has("Q")) pts += 0.6;
      const extra = Math.max(0, cards.length - 3);
      pts += extra * 0.5; // long trumps draw tricks
    } else {
      if (has("A")) pts += 0.9;
      if (has("K") && cards.length >= 2) pts += 0.6;
      // short side suit + trumps = ruffing potential
      if (cards.length <= 1 && hand.filter((c) => c.suit === "spades").length >= 2) pts += 0.5;
    }
  }
  const bid = Math.round(pts);
  // Nil only on a genuinely weak hand.
  const aces = hand.filter((c) => c.rank === "A").length;
  const highSpades = hand.filter((c) => c.suit === "spades" && rankValue(c.rank) >= rankValue("Q")).length;
  const spadeCount = hand.filter((c) => c.suit === "spades").length;
  if (aces === 0 && highSpades === 0 && spadeCount <= 3 && bid <= 1) return "nil";
  return Math.max(1, bid);
}

/** Pick a legal card for an AI seat. Beginner-reasonable, never illegal. */
export function aiPlay(state: GameState, seat: Seat): Card {
  const legal = legalMoves(state, seat);
  if (legal.length === 1) return legal[0];

  const lowest = (cs: Card[]) => cs.reduce((a, b) => (rankValue(a.rank) <= rankValue(b.rank) ? a : b));
  const highest = (cs: Card[]) => cs.reduce((a, b) => (rankValue(a.rank) >= rankValue(b.rank) ? a : b));

  const bid = state.bids[seat];
  const isNil = bid === "nil";
  const partnerNil = state.bids[partnerOf(seat)] === "nil";

  // Leading.
  if (state.trick.length === 0) {
    if (isNil) return lowest(legal);
    if (partnerNil) return highest(legal); // take the lead to protect partner
    const nonSpades = legal.filter((c) => c.suit !== "spades");
    const pool = nonSpades.length ? nonSpades : legal;
    // Lead a high non-spade (often a winner); avoid burning trumps early.
    return highest(pool);
  }

  // Following.
  const led = state.ledSuit!;
  const winnerSeat = currentWinner(state)!;
  const partnerWinning = teamOf(winnerSeat) === teamOf(seat);
  const winningCard = state.trick.find((p) => p.seat === winnerSeat)!.card;
  const inSuit = legal.filter((c) => c.suit === led);

  if (isNil) {
    // Try to lose: play highest card that still cannot win, else lowest.
    const losers = legal.filter((c) => !wouldWin(state, seat, c));
    return losers.length ? highest(losers) : lowest(legal);
  }

  if (inSuit.length > 0) {
    if (partnerWinning) return lowest(inSuit); // duck
    const beaters = inSuit.filter((c) => rankValue(c.rank) > rankValue(winningCard.rank) || winningCard.suit === "spades" ? false : rankValue(c.rank) > rankValue(winningCard.rank));
    const canBeat = inSuit.filter((c) => wouldWin(state, seat, c));
    if (canBeat.length) return lowest(canBeat); // win cheaply
    return lowest(inSuit); // can't win, dump low
  }

  // Void in led suit.
  if (partnerWinning) {
    const nonSpades = legal.filter((c) => c.suit !== "spades");
    return lowest(nonSpades.length ? nonSpades : legal); // don't waste a trump
  }
  const spades = legal.filter((c) => c.suit === "spades");
  if (spades.length) return lowest(spades); // trump in low
  return lowest(legal); // no trumps -> discard low
}

/** Would playing `card` currently win the trick? */
export function wouldWin(state: GameState, seat: Seat, card: Card): boolean {
  const hypothetical = [...state.trick, { seat, card }];
  return trickWinner(hypothetical, state.ledSuit ?? card.suit) === seat;
}
