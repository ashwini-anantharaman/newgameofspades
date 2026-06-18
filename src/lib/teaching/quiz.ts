import { Card, GameState, Seat, Suit, sameCard, partnerOf, rankValue } from "../engine/types";
import { currentWinner, legalMoves } from "../engine/rules";
import { evaluateBid, evaluateMoves } from "../engine/evaluate";
import type { PlayMode } from "./coach";
import { usesCoachQuiz } from "./coach";

const SUIT_SYM: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const SUIT_NAME: Record<Suit, string> = { spades: "Spades", hearts: "Hearts", diamonds: "Diamonds", clubs: "Clubs" };

export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYM[c.suit]}`;
}

export interface QuizOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
  card?: Card;
  bid?: number;
}

export function cardOptionId(c: Card): string {
  return `card-${c.suit}-${c.rank}`;
}

export interface QuizStep {
  id: string;
  hint: string;
  question: string;
  options: QuizOption[];
  forced?: boolean;
}

export interface MoveQuiz {
  steps: QuizStep[];
  bestCard?: Card;
  suggestedBid?: number;
}

function shuffleOptions(options: QuizOption[], seed: number): QuizOption[] {
  const out = [...options];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function wrong(label: string, feedback: string, extra?: Partial<QuizOption>): QuizOption {
  return { id: `w-${label}`, label, correct: false, feedback, ...extra };
}

function right(label: string, feedback: string, extra?: Partial<QuizOption>): QuizOption {
  return { id: `r-${label}`, label, correct: true, feedback, ...extra };
}

/** Play-phase quiz: hint + card MCQ (SpadesCoach-style). */
export function buildMoveQuiz(state: GameState, seat: Seat, mode: PlayMode): MoveQuiz | null {
  if (!usesCoachQuiz(mode) || state.phase !== "playing" || state.turn !== seat) return null;

  const legal = legalMoves(state, seat);
  if (legal.length === 0) return null;

  const evals = evaluateMoves(state, seat);
  const best = evals[0];
  const seed = state.seed + state.roundNumber * 97 + state.trick.length * 13 + legal.length;
  const hint = mode === "Hard" ? buildHardHint(state, seat) : buildHint(state, seat);

  return { steps: [buildPlayCardMcq(state, seat, best, hint, seed, mode)], bestCard: best.card };
}

/** Bid-phase quiz: how many tricks to bid? */
export function buildBidQuiz(state: GameState, seat: Seat, mode: PlayMode): MoveQuiz | null {
  if (!usesCoachQuiz(mode) || state.phase !== "bidding" || state.turn !== seat) return null;

  const hand = state.hands[seat];
  const bidEval = evaluateBid(hand);
  const est = bidEval.suggested;
  const seed = state.seed + state.roundNumber * 41;

  if (mode === "Hard") {
    const candidates = [est - 1, est, est + 1, est + 2]
      .filter((b) => b >= 0 && b <= 13)
      .filter((b, i, arr) => arr.indexOf(b) === i);
    const options = shuffleOptions(
      candidates.map((bid) => {
        const correct = bid === est;
        return {
          id: `bid-${bid}`,
          bid,
          label: `Bid ${bid}`,
          correct,
          feedback: correct
            ? `About ${est} tricks matches this hand's winners.`
            : bid > est
              ? `${bid} is a stretch — missing costs ${bid * 10} points.`
              : `${bid} leaves tricks on the table and piles up bags.`,
        };
      }),
      seed,
    );
    return {
      steps: [{
        id: "pick-bid",
        hint: "Count winners. No coaching on this one.",
        question: "How many tricks?",
        options,
      }],
      suggestedBid: est,
    };
  }

  const sp = hand.filter((c) => c.suit === "spades").length;
  const aces = hand.filter((c) => c.rank === "A").length;
  const high = Math.min(13, est + 2);
  const low = Math.max(0, est - 2);

  const options = shuffleOptions(
    [
      right("Bid what you can make", `You have ${sp} spades and ${aces} ace${aces === 1 ? "" : "s"} — about ${est} winners. Bidding what you can actually take is how you score.`, { id: `bid-${est}`, bid: est }),
      wrong("Bid aggressively", `${high} overreaches your ${aces} ace${aces === 1 ? "" : "s"} and ${sp} trumps — missing a bid costs you ${high * 10} points.`, { id: `bid-${high}`, bid: high }),
      wrong("Play it safe", `${low} leaves tricks on the table; under-bidding piles up bags that eventually cost you 100 points.`, { id: `bid-${low}`, bid: low }),
    ],
    seed,
  );

  return {
    steps: [{
      id: "pick-bid",
      hint: "Count your likely winners — aces, high spades, and short suits you can trump.",
      question: "How many tricks should you bid?",
      options,
    }],
    suggestedBid: est,
  };
}

function buildHardHint(state: GameState, seat: Seat): string {
  if (state.trick.length === 0) return "You're on lead — pick the best card.";
  if (state.ledSuit) {
    const hasLed = state.hands[seat].some((c) => c.suit === state.ledSuit);
    return hasLed
      ? `${SUIT_NAME[state.ledSuit!]} was led — follow suit if you can.`
      : `Void in ${SUIT_NAME[state.ledSuit!]} — trump or discard.`;
  }
  return "Hard mode — no extra hints.";
}

function buildHint(state: GameState, seat: Seat): string {
  const led = state.ledSuit;
  const leading = state.trick.length === 0;
  const partner = currentWinner(state);
  const partnerWinning = partner !== null && partner === partnerOf(seat);

  if (leading) {
    if (!state.spadesBroken && state.hands[seat].some((c) => c.suit !== "spades")) {
      return "You're leading and spades aren't broken yet — pick a non-spade unless that's all you have.";
    }
    return "You're opening the trick. Think about whether to win cheaply or shed a loser.";
  }

  if (led && state.hands[seat].some((c) => c.suit === led)) {
    const trickDesc = state.trick.map((t) => `${t.seat} ${cardLabel(t.card)}`).join(", ");
    if (partnerWinning) {
      return `Following ${SUIT_NAME[led]}. Trick so far: ${trickDesc}. Partner is winning — you can duck low.`;
    }
    return `Following ${SUIT_NAME[led]}. Trick so far: ${trickDesc}. Think about whether to win, duck, or dump a loser.`;
  }

  if (led) {
    return `You're void in ${SUIT_NAME[led]}. You may trump with spades or throw a loser.`;
  }

  return "It's your turn. The coach will quiz you on the best card — commit when you're ready.";
}

function buildPlayCardMcq(
  state: GameState,
  seat: Seat,
  best: ReturnType<typeof evaluateMoves>[0],
  hint: string,
  seed: number,
  mode: PlayMode,
): QuizStep {
  const legal = legalMoves(state, seat);
  const evals = evaluateMoves(state, seat);
  const leading = state.trick.length === 0;
  const hard = mode === "Hard";
  const question = hard
    ? (leading ? "Lead card?" : "Your play?")
    : (leading ? "You're on lead — which card do you play?" : "What's your play here?");

  if (legal.length === 1) {
    const card = legal[0];
    return {
      id: "pick-card",
      hint,
      question: "Only one legal card here.",
      forced: true,
      options: [{
        id: cardOptionId(card),
        label: hard ? cardLabel(card) : "Forced play",
        card,
        correct: true,
        feedback: "You must follow the led suit — no real choice this time.",
      }],
    };
  }

  const bestCard = best.card;
  const sorted = [...legal].sort((a, b) => {
    const ea = evals.find((e) => sameCard(e.card, a))?.score ?? 0;
    const eb = evals.find((e) => sameCard(e.card, b))?.score ?? 0;
    return eb - ea;
  });

  const maxOpts = hard ? 4 : 3;
  const picks: Card[] = [];
  for (const c of sorted) {
    if (picks.length >= maxOpts) break;
    if (!picks.some((p) => sameCard(p, c))) picks.push(c);
  }
  if (!picks.some((p) => sameCard(p, bestCard))) picks[picks.length - 1] = bestCard;

  const partner = currentWinner(state);
  const partnerWinning = partner !== null && partner === partnerOf(seat);

  const options: QuizOption[] = picks.map((card) => {
    const ev = evals.find((e) => sameCard(e.card, card))!;
    const isBest = sameCard(card, bestCard);
    let label: string;
    if (hard) {
      label = cardLabel(card);
    } else if (isBest) {
      label = "Best line";
    } else if (rankValue(card.rank) > rankValue(bestCard.rank) && card.suit === bestCard.suit) {
      label = "Overspend";
    } else if (partnerWinning) {
      label = "Too aggressive";
    } else {
      label = "Too passive";
    }

    let feedback: string;
    if (isBest) {
      feedback = hard
        ? ev.rationale || "Engine's top pick for this spot."
        : leading
          ? "Lead a strong side card and keep your spades to trump in later."
          : partnerWinning
            ? "Your partner is already winning — play low and save your strength."
            : ev.rationale || "Take the trick toward your bid with the lowest card that does the job.";
    } else if (rankValue(card.rank) > rankValue(bestCard.rank)) {
      feedback = "Wastes a high card you'll want later — don't beat your own partner or overpay for a trick.";
    } else {
      feedback = "Gives up control; you let opponents dictate the hand.";
    }

    return {
      id: cardOptionId(card),
      label,
      card,
      correct: isBest,
      feedback,
    };
  });

  return { id: "pick-card", hint, question, options: shuffleOptions(options, seed) };
}
