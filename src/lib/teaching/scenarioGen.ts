import type { Card, Seat } from "../engine/types";
import type { Scenario } from "../store/content";
import { SKILL_TREE } from "./skillTree";

const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });
const bids = { N: 3, E: 2, S: 3, W: 4 } as Record<Seat, number | "nil">;

/** Deterministic practice scenarios for every skill-tree node (offline fallback). */
const BASE: Record<string, Scenario[]> = {
  suits: [{
    id: "suits-1", nodeId: "suits", difficulty: 1,
    prompt: "Rank matters within each suit. Which card in your hand is the highest?",
    hand: [c("K", "hearts"), c("A", "spades"), c("Q", "diamonds"), c("5", "clubs")],
    trick: [], ledSuit: null, bids, spadesBroken: false,
    correctCards: [c("A", "spades")],
    explainCorrect: "Ace is highest in its suit — the A♠ tops every other card here.",
  }],
  trick: [{
    id: "trick-1", nodeId: "trick", difficulty: 1,
    prompt: "Hearts were led. Which card would win this trick if you played it now?",
    hand: [c("A", "hearts"), c("9", "hearts"), c("K", "clubs")],
    trick: [{ seat: "W", card: c("7", "hearts") }], ledSuit: "hearts", bids, spadesBroken: false,
    correctCards: [c("A", "hearts")],
    explainCorrect: "The Ace of hearts is highest of the led suit — it wins the trick.",
  }],
  follow: [{
    id: "follow-1", nodeId: "follow", difficulty: 1,
    prompt: "Hearts were led. Which cards may you legally play?",
    hand: [c("A", "spades"), c("9", "hearts"), c("3", "hearts"), c("K", "clubs")],
    trick: [{ seat: "W", card: c("5", "hearts") }], ledSuit: "hearts", bids, spadesBroken: false,
    correctCards: [c("9", "hearts"), c("3", "hearts")],
    explainCorrect: "You hold hearts — you must follow suit. Only the hearts are legal.",
  }],
  trump: [{
    id: "trump-1", nodeId: "trump", difficulty: 1,
    prompt: "A high heart is winning the trick. You're void in hearts — how do you take it?",
    hand: [c("2", "spades"), c("J", "diamonds"), c("4", "clubs")],
    trick: [{ seat: "W", card: c("A", "hearts") }, { seat: "N", card: c("3", "hearts") }],
    ledSuit: "hearts", bids, spadesBroken: false,
    correctCards: [c("2", "spades")],
    explainCorrect: "Any spade beats the Ace of hearts — even the 2♠ is trump.",
  }],
  breaking: [{
    id: "breaking-1", nodeId: "breaking", difficulty: 1,
    prompt: "Spades aren't broken yet. You're leading — which cards are legal to lead?",
    hand: [c("A", "spades"), c("K", "hearts"), c("5", "diamonds"), c("3", "clubs")],
    trick: [], ledSuit: null, bids, spadesBroken: false,
    correctCards: [c("K", "hearts"), c("5", "diamonds"), c("3", "clubs")],
    explainCorrect: "You can't lead spades until they're broken — lead a non-spade.",
  }],
  bid_basics: [{
    id: "bid_basics-1", nodeId: "bid_basics", difficulty: 1,
    prompt: "You bid 3 with your partner. Which opening lead gives you a fair shot at tricks?",
    hand: [c("A", "diamonds"), c("K", "diamonds"), c("7", "clubs"), c("4", "clubs")],
    trick: [], ledSuit: null, bids: { N: 3, E: 2, S: 3, W: 3 }, spadesBroken: false,
    correctCards: [c("A", "diamonds")],
    explainCorrect: "Leading an Ace is a strong start toward making your bid.",
  }],
  count_bid: [{
    id: "count_bid-1", nodeId: "count_bid", difficulty: 2,
    prompt: "Count likely winners before you play. Which card is most likely to win a trick here?",
    hand: [c("A", "spades"), c("K", "spades"), c("A", "clubs"), c("5", "hearts")],
    trick: [], ledSuit: null, bids: { N: 4, E: 2, S: 4, W: 3 }, spadesBroken: true,
    correctCards: [c("A", "spades")],
    explainCorrect: "High spades are almost always winners — count them toward your bid.",
  }],
  high_spades: [{
    id: "high_spades-1", nodeId: "high_spades", difficulty: 2,
    prompt: "You're void in hearts and want this trick. Which spade do you play?",
    hand: [c("A", "spades"), c("3", "spades"), c("J", "diamonds")],
    trick: [{ seat: "W", card: c("K", "hearts") }, { seat: "N", card: c("2", "hearts") }, { seat: "E", card: c("9", "hearts") }],
    ledSuit: "hearts", bids, spadesBroken: false,
    correctCards: [c("3", "spades")],
    explainCorrect: "A low spade already wins — save the Ace of spades for later.",
  }],
  partner: [{
    id: "partner-1", nodeId: "partner", difficulty: 2,
    prompt: "Your partner (North) is winning with the Ace of clubs. What do you play?",
    hand: [c("K", "clubs"), c("4", "clubs"), c("2", "clubs")],
    trick: [{ seat: "N", card: c("A", "clubs") }, { seat: "E", card: c("7", "clubs") }],
    ledSuit: "clubs", bids, spadesBroken: false,
    correctCards: [c("2", "clubs")],
    explainCorrect: "Partner already has the trick — duck with your lowest club.",
  }],
  bags: [{
    id: "bags-1", nodeId: "bags", difficulty: 3,
    prompt: "Your team already made its bid. Diamonds led — best play?",
    hand: [c("A", "diamonds"), c("4", "diamonds")],
    trick: [{ seat: "W", card: c("K", "diamonds") }],
    ledSuit: "diamonds", bids: { N: 2, E: 3, S: 2, W: 3 }, spadesBroken: true,
    correctCards: [c("4", "diamonds")],
    explainCorrect: "You don't need the trick — taking it just adds a bag. Duck with the 4.",
  }],
  nil: [{
    id: "nil-1", nodeId: "nil", difficulty: 2,
    prompt: "You bid nil — you must win zero tricks. Hearts were led. What do you play?",
    hand: [c("9", "hearts"), c("2", "hearts"), c("K", "spades")],
    trick: [{ seat: "W", card: c("6", "hearts") }],
    ledSuit: "hearts", bids: { N: 3, E: 2, S: "nil", W: 4 }, spadesBroken: false,
    correctCards: [c("2", "hearts")],
    explainCorrect: "Stay under the trick with your lowest heart — protect your nil.",
  }],
  setting: [{
    id: "setting-1", nodeId: "setting", difficulty: 3,
    prompt: "East-West need this trick to make their bid. How do you set them?",
    hand: [c("5", "spades"), c("8", "diamonds"), c("3", "clubs")],
    trick: [{ seat: "W", card: c("A", "diamonds") }, { seat: "N", card: c("6", "diamonds") }],
    ledSuit: "diamonds", bids: { N: 3, E: 5, S: 3, W: 5 }, spadesBroken: true,
    correctCards: [c("5", "spades")],
    explainCorrect: "Trump in and steal the trick — deny them the trick they need.",
  }],
};

export function scenariosForNode(nodeId: string): Scenario[] {
  return BASE[nodeId] ?? [];
}

export function allNodeIds(): string[] {
  return SKILL_TREE.map((n) => n.id);
}

export function hasScenario(nodeId: string): boolean {
  return scenariosForNode(nodeId).length > 0;
}
