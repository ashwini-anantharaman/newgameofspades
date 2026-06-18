import { PlayerProfile } from "./profile";

export interface SkillNode {
  id: string;
  title: string;
  blurb: string;
  deps: string[];        // prerequisite node ids
  teaches: string[];     // misconception ids this node resolves
  masteryTarget: number; // unprompted correct demonstrations to master
}

export type NodeStatus = "locked" | "available" | "in-progress" | "mastered";

export const SKILL_TREE: SkillNode[] = [
  { id: "suits", title: "Suits & ranking", blurb: "The four suits and how cards rank.", deps: [], teaches: [], masteryTarget: 2 },
  { id: "trick", title: "What is a trick", blurb: "One round of four cards; highest wins.", deps: ["suits"], teaches: [], masteryTarget: 2 },
  { id: "follow", title: "Following suit", blurb: "You must follow the led suit if you can.", deps: ["trick"], teaches: ["ignores_partner_winning"], masteryTarget: 3 },
  { id: "trump", title: "Spades are trump", blurb: "Any spade beats any other suit.", deps: ["trick"], teaches: [], masteryTarget: 3 },
  { id: "breaking", title: "Breaking spades", blurb: "Can't lead spades until they're broken.", deps: ["trump", "follow"], teaches: ["leads_spade_early"], masteryTarget: 2 },
  { id: "bid_basics", title: "Bidding basics", blurb: "Predict how many tricks you'll win.", deps: ["trick"], teaches: ["bids_by_card_count_not_winners"], masteryTarget: 2 },
  { id: "count_bid", title: "Counting your bid", blurb: "Estimate winners, not just high cards.", deps: ["bid_basics", "trump"], teaches: ["bids_by_card_count_not_winners"], masteryTarget: 3 },
  { id: "high_spades", title: "Not wasting high spades", blurb: "Win cheaply; save big trumps.", deps: ["trump", "follow"], teaches: ["wastes_high_spade", "overtrumps_partner"], masteryTarget: 3 },
  { id: "partner", title: "Reading your partner", blurb: "Duck when your partner is winning.", deps: ["follow", "count_bid"], teaches: ["ignores_partner_winning"], masteryTarget: 3 },
  { id: "bags", title: "Avoiding bags", blurb: "Don't take tricks you don't need.", deps: ["count_bid"], teaches: ["chases_bags"], masteryTarget: 3 },
  { id: "nil", title: "Nil", blurb: "Bidding and protecting zero tricks.", deps: ["count_bid", "follow"], teaches: ["breaks_nil"], masteryTarget: 2 },
  { id: "setting", title: "Setting opponents", blurb: "Force the other team below their bid.", deps: ["partner", "high_spades"], teaches: [], masteryTarget: 3 },
];

export const nodeById = (id: string): SkillNode | undefined => SKILL_TREE.find((n) => n.id === id);

export function isMastered(profile: PlayerProfile, id: string): boolean {
  const s = profile.skills[id];
  const node = nodeById(id);
  if (!s || !node) return false;
  return s.demonstrations >= node.masteryTarget && s.score >= 0.7;
}

/** Parent node cleared for progression: mastered, or lesson + practice done. */
export function isNodeCleared(profile: PlayerProfile, id: string): boolean {
  if (isMastered(profile, id)) return true;
  return Boolean(profile.lessonsCompleted?.[id] && profile.practicesCompleted?.[id]);
}

export function nodeStatus(profile: PlayerProfile, id: string): NodeStatus {
  const node = nodeById(id);
  if (!node) return "locked";
  if (isMastered(profile, id)) return "mastered";
  const depsMet = node.deps.every((d) => isNodeCleared(profile, d));
  if (!depsMet) return "locked";
  const s = profile.skills[id];
  if (profile.lessonsCompleted?.[id] || profile.practicesCompleted?.[id] || (s && s.attempts > 0)) {
    return "in-progress";
  }
  return "available";
}

/** All node statuses, for the Curriculum screen. */
export function allStatuses(profile: PlayerProfile): Record<string, NodeStatus> {
  const out: Record<string, NodeStatus> = {};
  for (const n of SKILL_TREE) out[n.id] = nodeStatus(profile, n.id);
  return out;
}

/** Next recommended node: lowest-index available or in-progress, prioritising decayed. */
export function nextRecommended(profile: PlayerProfile): string | null {
  const decayed = SKILL_TREE.find((n) => profile.skills[n.id]?.decayed && nodeStatus(profile, n.id) !== "locked");
  if (decayed) return decayed.id;
  const open = SKILL_TREE.find((n) => ["available", "in-progress"].includes(nodeStatus(profile, n.id)));
  return open?.id ?? null;
}
