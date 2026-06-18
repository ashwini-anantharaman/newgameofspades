import { Card, GameState, Seat, rankValue, partnerOf, teamOf, SUITS } from "./types";
import { legalMoves, currentWinner, trickWinner } from "./rules";
import { wouldWin, aiBid } from "./ai";

export interface MoveEval {
  card: Card;
  score: number;      // 0..1, higher is better
  best: boolean;
  weak: boolean;
  tags: string[];     // machine-readable reasons
  nodeIds: string[];  // skill-tree concepts this move exercises
  rationale: string;  // one-line plain-English explanation
}

const tagNodes: Record<string, string[]> = {
  "follows-suit": ["follow"],
  "duck-under-partner": ["partner", "follow"],
  "wins-cheaply": ["follow", "trick_efficiency" as string],
  "wastes-high-card": ["follow"],
  "wastes-high-spade": ["high_spades", "trump"],
  "ignores-partner-winning": ["partner"],
  "overtrumps-partner": ["partner", "high_spades"],
  "trumps-in": ["trump", "high_spades"],
  "leads-spade-early": ["breaking"],
  "good-lead": ["count_bid"],
  "creates-bag": ["bags"],
  "protects-nil": ["nil", "partner"],
  "breaks-nil": ["nil"],
  "safe-discard": ["follow"],
};

function nodesFor(tags: string[]): string[] {
  const set = new Set<string>();
  for (const t of tags) (tagNodes[t] ?? []).forEach((n) => set.add(n));
  return [...set];
}

/** Evaluate every legal move for `seat`. Pure, deterministic ground truth. */
export function evaluateMoves(state: GameState, seat: Seat): MoveEval[] {
  const legal = legalMoves(state, seat);
  const isNil = state.bids[seat] === "nil";
  const partnerNil = state.bids[partnerOf(seat)] === "nil";
  const teamNeedsTricks = needsTricks(state, seat);

  const evals: MoveEval[] = legal.map((card) => {
    let score = 0.5;
    const tags: string[] = [];
    let rationale = "";

    const leading = state.trick.length === 0;
    const winsNow = !leading && wouldWin(state, seat, card);
    const winnerSeat = leading ? null : currentWinner(state);
    const partnerWinning = winnerSeat ? teamOf(winnerSeat) === teamOf(seat) : false;
    const isHighSpade = card.suit === "spades" && rankValue(card.rank) >= rankValue("Q");

    if (leading) {
      if (isNil) {
        score = card.suit !== "spades" && rankValue(card.rank) <= rankValue("6") ? 0.85 : 0.4;
        tags.push("follows-suit");
        rationale = "Leading low keeps your nil safe.";
      } else if (card.suit === "spades") {
        // legal spade lead means broken or spade-only hand
        score = 0.45;
        tags.push("leads-spade-early");
        rationale = "Leading spades now spends trumps you may want later.";
      } else {
        const high = rankValue(card.rank) >= rankValue("K");
        score = high ? 0.75 : 0.55;
        tags.push("good-lead");
        rationale = high ? "A strong lead that often wins the trick." : "A safe, flexible lead.";
      }
    } else if (isNil) {
      const w = wouldWin(state, seat, card);
      score = w ? 0.1 : 0.85;
      tags.push(w ? "breaks-nil" : "follows-suit");
      rationale = w ? "This could win a trick and break your nil." : "Stays under the trick — protects your nil.";
    } else if (card.suit === state.ledSuit) {
      // following suit
      if (partnerWinning) {
        const low = isLowestInSuit(state, seat, card);
        score = low ? 0.85 : 0.35;
        tags.push(low ? "duck-under-partner" : "ignores-partner-winning");
        rationale = low
          ? "Your partner is winning — duck low and save your high cards."
          : "Your partner already has this trick; a high card here is wasted.";
      } else if (winsNow) {
        const cheap = isCheapestWinner(state, seat, card);
        score = cheap ? 0.9 : 0.5;
        tags.push(cheap ? "wins-cheaply" : "wastes-high-card");
        rationale = cheap ? "Wins the trick with the smallest card that does the job." : "Wins, but overspends — a lower card would have won too.";
        if (!teamNeedsTricks) { score -= 0.2; tags.push("creates-bag"); rationale += " You may not need this trick — watch your bags."; }
      } else {
        score = 0.7;
        tags.push("follows-suit");
        rationale = "Can't win here, so dumping a low card is correct.";
      }
    } else {
      // void in led suit
      if (partnerNil && winsNow) { score = 0.9; tags.push("protects-nil"); rationale = "Takes the trick to protect your partner's nil."; }
      else if (partnerWinning) {
        if (card.suit === "spades") { score = 0.3; tags.push("wastes-high-spade"); rationale = "Partner is winning — no need to trump in."; }
        else { score = 0.8; tags.push("safe-discard"); rationale = "Partner has it; discard a loser and keep your trumps."; }
      } else if (card.suit === "spades") {
        if (winsNow) {
          const cheap = isCheapestWinner(state, seat, card);
          if (isHighSpade && !cheap) { score = 0.45; tags.push("wastes-high-spade"); rationale = "Trumps in, but a lower spade would have won."; }
          else { score = teamNeedsTricks ? 0.88 : 0.55; tags.push("trumps-in"); rationale = "Trumps the trick with a low spade."; }
        } else { score = 0.4; tags.push("wastes-high-spade"); rationale = "This spade can't win the trick — better to discard."; }
      } else {
        score = 0.7; tags.push("safe-discard"); rationale = "Discard a low loser and hold your trumps.";
      }
    }

    score = Math.max(0, Math.min(1, score));
    return { card, score, best: false, weak: score < 0.45, tags, nodeIds: nodesFor(tags), rationale };
  });

  const max = Math.max(...evals.map((e) => e.score));
  for (const e of evals) if (e.score === max) { e.best = true; break; }
  return evals.sort((a, b) => b.score - a.score);
}

export interface BidEval { suggested: number; range: [number, number]; factors: string[]; }

export function evaluateBid(hand: Card[]): BidEval {
  const factors: string[] = [];
  const aces = hand.filter((c) => c.rank === "A");
  if (aces.length) factors.push(`${aces.length} ace${aces.length > 1 ? "s" : ""} — likely winners`);
  const spades = hand.filter((c) => c.suit === "spades");
  factors.push(`${spades.length} spades (trumps)`);
  const highSpades = spades.filter((c) => rankValue(c.rank) >= rankValue("Q"));
  if (highSpades.length) factors.push(`${highSpades.length} high spade${highSpades.length > 1 ? "s" : ""}`);
  for (const suit of SUITS.filter((s) => s !== "spades")) {
    const n = hand.filter((c) => c.suit === suit).length;
    if (n <= 1 && spades.length >= 2) factors.push(`short in ${suit} — ruffing chance`);
  }
  const base = aiBid(hand);
  const suggested = base === "nil" ? 0 : base;
  return { suggested, range: [Math.max(0, suggested - 1), suggested + 1], factors };
}

// helpers
function isLowestInSuit(state: GameState, seat: Seat, card: Card): boolean {
  const inSuit = state.hands[seat].filter((c) => c.suit === card.suit);
  return inSuit.every((c) => rankValue(c.rank) >= rankValue(card.rank));
}
function isCheapestWinner(state: GameState, seat: Seat, card: Card): boolean {
  const winners = legalMoves(state, seat).filter((c) => c.suit === card.suit && wouldWin(state, seat, c));
  return winners.every((c) => rankValue(c.rank) >= rankValue(card.rank));
}
function needsTricks(state: GameState, seat: Seat): boolean {
  const team = teamOf(seat);
  const seats: Seat[] = team === "NS" ? ["N", "S"] : ["E", "W"];
  let contract = 0;
  for (const s of seats) if (typeof state.bids[s] === "number") contract += state.bids[s] as number;
  const won = seats.reduce((sum, s) => sum + state.tricksWon[s], 0);
  return won < contract;
}
