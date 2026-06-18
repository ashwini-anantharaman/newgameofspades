export interface Misconception {
  id: string;
  label: string;
  fixNode: string; // skill-tree node that addresses it
  explain: string; // shown in the Game Report
}

export const MISCONCEPTIONS: Record<string, Misconception> = {
  leads_spade_early: {
    id: "leads_spade_early", label: "Leading spades too early", fixNode: "breaking",
    explain: "You led a spade before it helped. Hold trumps until you're forced or it wins something.",
  },
  wastes_high_spade: {
    id: "wastes_high_spade", label: "Wasting high spades", fixNode: "high_spades",
    explain: "You spent a big trump when a small one (or none) would do. Save high spades for high stakes.",
  },
  overtrumps_partner: {
    id: "overtrumps_partner", label: "Trumping your own partner", fixNode: "partner",
    explain: "Your partner was already winning, so trumping in just wasted a card.",
  },
  bids_by_card_count_not_winners: {
    id: "bids_by_card_count_not_winners", label: "Bidding by high-card count", fixNode: "count_bid",
    explain: "Bid by tricks you'll actually win, not just how many face cards you hold.",
  },
  ignores_partner_winning: {
    id: "ignores_partner_winning", label: "Not reading your partner", fixNode: "partner",
    explain: "When your partner is winning the trick, duck low instead of overpaying.",
  },
  chases_bags: {
    id: "chases_bags", label: "Chasing unneeded tricks", fixNode: "bags",
    explain: "You took tricks past your bid. Extra tricks become bags and eventually cost 100 points.",
  },
  breaks_nil: {
    id: "breaks_nil", label: "Breaking a nil bid", fixNode: "nil",
    explain: "A nil means zero tricks. Always play the card that cannot win.",
  },
  underleads_ace: {
    id: "underleads_ace", label: "Underleading an Ace", fixNode: "follow",
    explain: "Leading low away from an Ace risks losing control of the suit.",
  },
};

/** Map an evaluator tag on a played card to a misconception id, if any. */
export function misconceptionForTag(tag: string): string | undefined {
  const map: Record<string, string> = {
    "leads-spade-early": "leads_spade_early",
    "wastes-high-spade": "wastes_high_spade",
    "overtrumps-partner": "overtrumps_partner",
    "ignores-partner-winning": "ignores_partner_winning",
    "creates-bag": "chases_bags",
    "breaks-nil": "breaks_nil",
  };
  return map[tag];
}
