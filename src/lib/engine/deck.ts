import { Card, Seat, SEATS, SUITS, RANKS } from "./types";

// Deterministic PRNG (mulberry32) so games are reproducible from a seed.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

export function shuffle<T>(arr: T[], seed: number): T[] {
  const rand = rng(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(seed: number): Record<Seat, Card[]> {
  const deck = shuffle(buildDeck(), seed);
  const hands: Record<Seat, Card[]> = { N: [], E: [], S: [], W: [] };
  deck.forEach((card, i) => hands[SEATS[i % 4]].push(card));
  for (const s of SEATS) hands[s] = sortHand(hands[s]);
  return hands;
}

export function sortHand(cards: Card[]): Card[] {
  const order = SUITS; // spades, hearts, diamonds, clubs
  return cards.slice().sort((a, b) => {
    const s = order.indexOf(a.suit) - order.indexOf(b.suit);
    if (s !== 0) return s;
    return RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank);
  });
}
