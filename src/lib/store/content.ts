import { Card, Seat } from "../engine/types";

// ---- Lessons (screen 05) ----
export interface LessonStep { heading: string; body: string; takeaway: string; demo: string; }
export interface Lesson { nodeId: string; title: string; steps: LessonStep[]; }

export const LESSONS: Record<string, Lesson> = {
  suits: { nodeId: "suits", title: "Suits & ranking", steps: [
    { heading: "Four suits", body: "Spades, hearts, diamonds, clubs. Each suit has thirteen cards from 2 (low) to Ace (high).", takeaway: "Ace is highest in its suit, 2 is lowest.", demo: "rankRow" },
    { heading: "Spades are special", body: "In Spades, the spade suit is trump — but you still rank cards within each suit the same way.", takeaway: "Learn ranks first; trump comes later.", demo: "rankRow" },
  ]},
  trick: { nodeId: "trick", title: "What is a trick", steps: [
    { heading: "One trick", body: "Each player plays one card. The highest card of the led suit wins all four.", takeaway: "Highest of the led suit wins — unless a spade is played.", demo: "normalTrick" },
  ]},
  follow: { nodeId: "follow", title: "Following suit", steps: [
    { heading: "Follow if you can", body: "You must play the suit that was led if you hold it. Only when you're void may you play something else.", takeaway: "Have the led suit? You must play it.", demo: "followDemo" },
  ]},
  trump: { nodeId: "trump", title: "Spades are trump", steps: [
    { heading: "Trumps win", body: "A spade beats any card of another suit — even the 2 of spades beats the Ace of hearts.", takeaway: "Out of the led suit? A spade can steal the trick.", demo: "trumpTrick" },
  ]},
  breaking: { nodeId: "breaking", title: "Breaking spades", steps: [
    { heading: "Wait to lead spades", body: "You can't lead a spade until spades are 'broken' — first played when someone is void in the led suit.", takeaway: "No leading spades until they're broken.", demo: "breakingDemo" },
  ]},
  bid_basics: { nodeId: "bid_basics", title: "Bidding basics", steps: [
    { heading: "Predict your tricks", body: "Before play, each player bids how many tricks they expect. Your bid plus your partner's is your team's target.", takeaway: "Bid what you can win — together.", demo: "bidDemo" },
  ]},
  count_bid: { nodeId: "count_bid", title: "Counting your bid", steps: [
    { heading: "Count winners", body: "Count likely winners — Aces, high spades, long trumps — not just face cards.", takeaway: "Winners, not just high cards.", demo: "countDemo" },
  ]},
  high_spades: { nodeId: "high_spades", title: "Not wasting high spades", steps: [
    { heading: "Win cheaply", body: "If a small spade wins the trick, don't spend a big one. Save high trumps for when they matter.", takeaway: "Win with the smallest card that does the job.", demo: "cheapWin" },
  ]},
  partner: { nodeId: "partner", title: "Reading your partner", steps: [
    { heading: "Duck for partner", body: "If your partner is already winning the trick, play low. Don't beat your own side.", takeaway: "Partner winning? Duck low.", demo: "duckDemo" },
  ]},
  bags: { nodeId: "bags", title: "Avoiding bags", steps: [
    { heading: "Don't over-win", body: "Tricks past your bid are 'bags'. Ten bags cost you 100 points, so stop grabbing tricks you don't need.", takeaway: "Extra tricks can hurt — watch your bags.", demo: "bagDemo" },
  ]},
  nil: { nodeId: "nil", title: "Nil", steps: [
    { heading: "Zero tricks", body: "A nil bid means you'll win none. Succeed for +100; take even one and it's −100.", takeaway: "Nil = win nothing, on purpose.", demo: "nilDemo" },
  ]},
  setting: { nodeId: "setting", title: "Setting opponents", steps: [
    { heading: "Set them", body: "Win tricks the opponents needed so they fall short of their bid — they lose 10 per bid trick.", takeaway: "Deny their tricks to set them.", demo: "setDemo" },
  ]},
};

// ---- Practice scenarios (screen 06) ----
export interface Scenario {
  id: string;
  nodeId: string;
  difficulty: 1 | 2 | 3;
  prompt: string;
  hand: Card[];
  trick: { seat: Seat; card: Card }[];
  ledSuit: string | null;
  bids: Record<Seat, number | "nil">;
  spadesBroken: boolean;
  // The card(s) considered correct, keyed for grading.
  correctCards: Card[];
  explainCorrect: string;
}

const c = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

export const SCENARIOS: Scenario[] = [
  {
    id: "follow-1", nodeId: "follow", difficulty: 1,
    prompt: "Hearts were led. Which cards may you legally play?",
    hand: [c("A", "spades"), c("9", "hearts"), c("3", "hearts"), c("K", "clubs")],
    trick: [{ seat: "W", card: c("5", "hearts") }], ledSuit: "hearts",
    bids: { N: 3, E: 2, S: 3, W: 4 }, spadesBroken: false,
    correctCards: [c("9", "hearts"), c("3", "hearts")],
    explainCorrect: "You hold hearts, so you must follow suit — only the hearts are legal.",
  },
  {
    id: "partner-1", nodeId: "partner", difficulty: 2,
    prompt: "Your partner (North) is winning with the Ace of clubs. What do you play?",
    hand: [c("K", "clubs"), c("4", "clubs"), c("2", "clubs")],
    trick: [{ seat: "N", card: c("A", "clubs") }, { seat: "E", card: c("7", "clubs") }],
    ledSuit: "clubs", bids: { N: 4, E: 2, S: 3, W: 3 }, spadesBroken: false,
    correctCards: [c("2", "clubs")],
    explainCorrect: "Partner already has the trick — duck with your lowest club and save the King.",
  },
  {
    id: "high_spades-1", nodeId: "high_spades", difficulty: 2,
    prompt: "You're void in hearts and want this trick. Which spade do you play?",
    hand: [c("A", "spades"), c("3", "spades"), c("J", "diamonds")],
    trick: [{ seat: "W", card: c("K", "hearts") }, { seat: "N", card: c("2", "hearts") }, { seat: "E", card: c("9", "hearts") }],
    ledSuit: "hearts", bids: { N: 3, E: 2, S: 4, W: 3 }, spadesBroken: false,
    correctCards: [c("3", "spades")],
    explainCorrect: "A low spade already wins — save the Ace of spades for later.",
  },
  {
    id: "bags-1", nodeId: "bags", difficulty: 3,
    prompt: "Your team has already made its bid. Diamonds led, you can win or duck. Best play?",
    hand: [c("A", "diamonds"), c("4", "diamonds")],
    trick: [{ seat: "W", card: c("K", "diamonds") }],
    ledSuit: "diamonds", bids: { N: 2, E: 3, S: 2, W: 3 }, spadesBroken: true,
    correctCards: [c("4", "diamonds")],
    explainCorrect: "You don't need the trick — taking it just adds a bag. Duck with the 4.",
  },
];

export function scenariosFor(nodeId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.nodeId === nodeId);
}

// ---- Onboarding (screen 02) ----
export interface OnboardingQ { id: string; question: string; options: { label: string; nodeSeed?: Record<string, number> }[]; }
export const ONBOARDING: OnboardingQ[] = [
  { id: "experience", question: "Have you played Spades before?", options: [
    { label: "Never", nodeSeed: {} },
    { label: "A little", nodeSeed: { suits: 0.5, trick: 0.5 } },
    { label: "I know it", nodeSeed: { suits: 0.8, trick: 0.8, follow: 0.6, trump: 0.6 } },
  ]},
  { id: "trump", question: "Which card beats a high heart in a trick?", options: [
    { label: "A higher heart", nodeSeed: { trick: 0.3 } },
    { label: "Any spade", nodeSeed: { trick: 0.6, trump: 0.6 } },
    { label: "Not sure", nodeSeed: {} },
  ]},
];
