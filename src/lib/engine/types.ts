// Core Spades engine types. Framework-agnostic, no React/DOM.

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type Seat = "N" | "E" | "S" | "W";
export type Team = "NS" | "EW";

export interface Card { suit: Suit; rank: Rank; }
export interface Play { seat: Seat; card: Card; }

export type Bid = number | "nil";

export type Phase = "bidding" | "playing" | "scoring" | "gameOver";

export interface GameState {
  seed: number;
  dealer: Seat;
  hands: Record<Seat, Card[]>;
  bids: Record<Seat, Bid | null>;
  trick: Play[];
  ledSuit: Suit | null;
  spadesBroken: boolean;
  tricksWon: Record<Seat, number>;
  turn: Seat;
  phase: Phase;
  scores: Record<Team, number>;
  bags: Record<Team, number>;
  roundNumber: number;
  lastTrickWinner: Seat | null;
  history: RoundResult[];
  config: RuleConfig;
}

export interface RuleConfig {
  targetScore: number;   // game ends when a team reaches this
  bagPenalty: number;    // points lost per 10 accumulated bags
  bagThreshold: number;  // bags that trigger the penalty
  nilValue: number;      // +/- for nil success/failure
}

export interface RoundResult {
  roundNumber: number;
  bids: Record<Seat, Bid>;
  tricksWon: Record<Seat, number>;
  delta: Record<Team, number>;
  bagsAdded: Record<Team, number>;
  nil: Partial<Record<Seat, "made" | "broken">>;
  scoresAfter: Record<Team, number>;
}

export type Action =
  | { type: "BID"; seat: Seat; bid: Bid }
  | { type: "PLAY"; seat: Seat; card: Card };

export const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
export const SUITS: Suit[] = ["spades","hearts","diamonds","clubs"];
export const SEATS: Seat[] = ["N","E","S","W"];

export const DEFAULT_CONFIG: RuleConfig = {
  targetScore: 500,
  bagPenalty: 100,
  bagThreshold: 10,
  nilValue: 100,
};

export const teamOf = (seat: Seat): Team => (seat === "N" || seat === "S" ? "NS" : "EW");
export const partnerOf = (seat: Seat): Seat =>
  ({ N: "S", S: "N", E: "W", W: "E" } as Record<Seat, Seat>)[seat];
export const nextSeat = (seat: Seat): Seat =>
  ({ N: "E", E: "S", S: "W", W: "N" } as Record<Seat, Seat>)[seat];
export const rankValue = (r: Rank): number => RANKS.indexOf(r);
export const cardId = (c: Card): string => `${c.rank}${c.suit[0]}`;
export const sameCard = (a: Card, b: Card): boolean => a.suit === b.suit && a.rank === b.rank;
