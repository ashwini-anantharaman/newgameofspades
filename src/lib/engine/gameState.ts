import {
  Action, Card, GameState, RuleConfig, Seat, SEATS, DEFAULT_CONFIG,
  nextSeat, teamOf, sameCard,
} from "./types";
import { deal } from "./deck";
import { legalMoves, trickWinner, isLegal } from "./rules";
import { scoreRound, isGameOver } from "./scoring";
import { aiBid, aiPlay } from "./ai";

export function newGame(seed = Date.now() % 2 ** 31, config: RuleConfig = DEFAULT_CONFIG): GameState {
  return startRound({
    seed,
    dealer: "W", // so left-of-dealer (N) bids/leads first
    hands: { N: [], E: [], S: [], W: [] },
    bids: { N: null, E: null, S: null, W: null },
    trick: [],
    ledSuit: null,
    spadesBroken: false,
    tricksWon: { N: 0, E: 0, S: 0, W: 0 },
    turn: "N",
    phase: "bidding",
    scores: { NS: 0, EW: 0 },
    bags: { NS: 0, EW: 0 },
    roundNumber: 0,
    lastTrickWinner: null,
    history: [],
    config,
  });
}

export function startRound(prev: GameState): GameState {
  const roundNumber = prev.roundNumber + 1;
  const seed = prev.seed + roundNumber * 7919;
  const dealer = nextSeat(prev.dealer);
  const first = nextSeat(dealer);
  return {
    ...prev,
    hands: deal(seed),
    bids: { N: null, E: null, S: null, W: null },
    trick: [],
    ledSuit: null,
    spadesBroken: false,
    tricksWon: { N: 0, E: 0, S: 0, W: 0 },
    turn: first,
    phase: "bidding",
    roundNumber,
    dealer,
    lastTrickWinner: null,
  };
}

/** Pure reducer. Applies one human/AI action. Does NOT auto-run AI. */
export function applyAction(state: GameState, action: Action): GameState {
  if (action.type === "BID") return applyBid(state, action.seat, action.bid);
  return applyPlay(state, action.seat, action.card);
}

function applyBid(state: GameState, seat: Seat, bid: GameState["bids"][Seat]): GameState {
  if (state.phase !== "bidding" || state.turn !== seat || state.bids[seat] !== null) return state;
  const bids = { ...state.bids, [seat]: bid };
  const allIn = SEATS.every((s) => bids[s] !== null);
  return {
    ...state,
    bids,
    turn: nextSeat(seat),
    phase: allIn ? "playing" : "bidding",
    // first leader is left of dealer (already set in turn after last bid)
    ...(allIn ? { turn: nextSeat(state.dealer) } : {}),
  };
}

function applyPlay(state: GameState, seat: Seat, card: Card): GameState {
  if (state.phase !== "playing" || state.turn !== seat) return state;
  if (!isLegal(state, seat, card)) return state;

  const hands = { ...state.hands, [seat]: state.hands[seat].filter((c) => !sameCard(c, card)) };
  const trick = [...state.trick, { seat, card }];
  const ledSuit = state.trick.length === 0 ? card.suit : state.ledSuit;
  const spadesBroken = state.spadesBroken || card.suit === "spades";

  // Trick complete?
  if (trick.length === 4) {
    const winner = trickWinner(trick, ledSuit!);
    const tricksWon = { ...state.tricksWon, [winner]: state.tricksWon[winner] + 1 };
    const handsEmpty = hands[winner].length === 0;
    const base: GameState = {
      ...state, hands, trick: [], ledSuit: null, spadesBroken,
      tricksWon, turn: winner, lastTrickWinner: winner,
    };
    if (handsEmpty) return endRound(base);
    return base;
  }

  return { ...state, hands, trick, ledSuit, spadesBroken, turn: nextSeat(seat) };
}

function endRound(state: GameState): GameState {
  const result = scoreRound(state);
  const scores = result.scoresAfter;
  const bags = { ...state.bags };
  // recompute bags consistent with scoreRound
  (["NS", "EW"] as const).forEach((t) => {
    bags[t] += result.bagsAdded[t];
    while (bags[t] >= state.config.bagThreshold) bags[t] -= state.config.bagThreshold;
  });
  const history = [...state.history, { ...result, scoresAfter: scores }];
  const over = isGameOver(scores, state.config.targetScore);
  return { ...state, scores, bags, history, phase: over ? "gameOver" : "scoring" };
}

/** Auto-run all non-human seats until it's the human's turn, the round ends,
 *  or the game is over. Returns the new state plus the sequence of AI actions
 *  taken (useful for animation + coaching review). */
export function advance(state: GameState, human: Seat = "S"): { state: GameState; events: Action[] } {
  let s = state;
  const events: Action[] = [];
  let guard = 0;
  while (guard++ < 200) {
    if (s.phase === "gameOver" || s.phase === "scoring") break;
    if (s.turn === human) break;
    if (s.phase === "bidding") {
      const bid = aiBid(s.hands[s.turn]);
      const action: Action = { type: "BID", seat: s.turn, bid };
      events.push(action); s = applyAction(s, action);
    } else if (s.phase === "playing") {
      const card = aiPlay(s, s.turn);
      const action: Action = { type: "PLAY", seat: s.turn, card };
      events.push(action); s = applyAction(s, action);
    }
  }
  return { state: s, events };
}

/** Apply a single AI action (one seat), or return null when human's turn / round over. */
export function stepAdvance(state: GameState, human: Seat = "S"): { state: GameState; event: Action | null } {
  if (state.phase === "gameOver" || state.phase === "scoring") return { state, event: null };
  if (state.turn === human) return { state, event: null };
  if (state.phase === "bidding") {
    const bid = aiBid(state.hands[state.turn]);
    const action: Action = { type: "BID", seat: state.turn, bid };
    return { state: applyAction(state, action), event: action };
  }
  if (state.phase === "playing") {
    const card = aiPlay(state, state.turn);
    const action: Action = { type: "PLAY", seat: state.turn, card };
    return { state: applyAction(state, action), event: action };
  }
  return { state, event: null };
}
