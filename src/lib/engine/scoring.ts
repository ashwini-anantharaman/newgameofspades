import { GameState, RoundResult, Seat, Team, Bid, teamOf, partnerOf, SEATS } from "./types";

const TEAM_SEATS: Record<Team, [Seat, Seat]> = { NS: ["N", "S"], EW: ["E", "W"] };

/** Score the completed round; returns deltas and a full RoundResult. Pure. */
export function scoreRound(state: GameState): RoundResult {
  const { bids, tricksWon, config, bags, scores } = state;
  const delta: Record<Team, number> = { NS: 0, EW: 0 };
  const bagsAdded: Record<Team, number> = { NS: 0, EW: 0 };
  const nil: Partial<Record<Seat, "made" | "broken">> = {};

  (["NS", "EW"] as Team[]).forEach((team) => {
    const [a, b] = TEAM_SEATS[team];
    const seats: Seat[] = [a, b];

    // Nil handled per-seat.
    let nilPoints = 0;
    const contractSeats: Seat[] = [];
    for (const s of seats) {
      if (bids[s] === "nil") {
        const made = tricksWon[s] === 0;
        nil[s] = made ? "made" : "broken";
        nilPoints += made ? config.nilValue : -config.nilValue;
      } else {
        contractSeats.push(s);
      }
    }

    const contract = contractSeats.reduce((sum, s) => sum + (bids[s] as number), 0);
    const teamTricks = seats.reduce((sum, s) => sum + tricksWon[s], 0);
    // Tricks a nil bidder accidentally took still count toward the team total
    // (they become bags), but do not help meet the contract.
    const tricksTowardContract = teamTricks;

    let teamDelta = nilPoints;
    if (contractSeats.length > 0) {
      if (tricksTowardContract >= contract) {
        const over = tricksTowardContract - contract;
        teamDelta += contract * 10 + over;
        bagsAdded[team] = over;
      } else {
        teamDelta += -contract * 10;
      }
    } else {
      // Both bid nil: any tricks taken are pure bags.
      bagsAdded[team] = teamTricks;
      teamDelta += teamTricks; // each bag is +1 but pushes toward penalty
    }

    delta[team] = teamDelta;
  });

  // Apply bag penalty.
  const scoresAfter: Record<Team, number> = { ...scores };
  const newBags: Record<Team, number> = { ...bags };
  (["NS", "EW"] as Team[]).forEach((team) => {
    scoresAfter[team] += delta[team];
    newBags[team] += bagsAdded[team];
    while (newBags[team] >= config.bagThreshold) {
      scoresAfter[team] -= config.bagPenalty;
      newBags[team] -= config.bagThreshold;
    }
  });

  return {
    roundNumber: state.roundNumber,
    bids: { ...bids } as Record<Seat, Bid>,
    tricksWon: { ...tricksWon },
    delta,
    bagsAdded,
    nil,
    scoresAfter,
  };
}

export function isGameOver(scores: Record<Team, number>, target: number): boolean {
  return scores.NS >= target || scores.EW >= target;
}

export function gameWinner(scores: Record<Team, number>, target: number): Team | null {
  if (!isGameOver(scores, target)) return null;
  if (scores.NS === scores.EW) return null;
  return scores.NS > scores.EW ? "NS" : "EW";
}
