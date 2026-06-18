import { PlayerProfile, strengths, weaknesses } from "../teaching/profile";
import { SKILL_TREE, allStatuses, nextRecommended, nodeById, isMastered } from "../teaching/skillTree";
import { needsReview } from "../teaching/scheduler";
import { MISCONCEPTIONS } from "../teaching/misconceptions";
import { GameState, Team } from "../engine/types";

// ---- 02 Onboarding ----
import { ONBOARDING } from "./content";
export function seedProfileFromOnboarding(profile: PlayerProfile, picks: Record<string, number>): PlayerProfile {
  const skills = { ...profile.skills };
  for (const q of ONBOARDING) {
    const choice = q.options[picks[q.id] ?? 0];
    for (const [id, val] of Object.entries(choice.nodeSeed ?? {})) {
      if (skills[id]) skills[id] = { ...skills[id], score: Math.max(skills[id].score, val) };
    }
  }
  return { ...profile, skills };
}

// ---- 03 Dashboard ----
export interface DashboardData {
  masteryPct: number;
  continueNodeId: string | null;
  continueTitle: string;
  stats: { mastered: number; games: number; streak: number };
  focus: { id: string; title: string }[];
}
export function dashboard(profile: PlayerProfile, gamesPlayed: number): DashboardData {
  const masteredCount = SKILL_TREE.filter((n) => isMastered(profile, n.id)).length;
  const next = nextRecommended(profile);
  const focus = weaknesses(profile, 2).map((id) => ({ id, title: nodeById(id)?.title ?? id }));
  return {
    masteryPct: Math.round((masteredCount / SKILL_TREE.length) * 100),
    continueNodeId: next,
    continueTitle: next ? nodeById(next)?.title ?? "" : "Play a game",
    stats: { mastered: masteredCount, games: gamesPlayed, streak: streak(profile) },
    focus,
  };
}
function streak(profile: PlayerProfile): number {
  // consecutive most-recent correct entries
  let s = 0;
  for (let i = profile.history.length - 1; i >= 0; i--) {
    if (profile.history[i].correct) s++; else break;
  }
  return s;
}

// ---- 04 Curriculum ----
export interface CurriculumNodeVM {
  id: string; title: string; blurb: string;
  status: ReturnType<typeof allStatuses>[string];
  demonstrations: number; masteryTarget: number; decayed: boolean; deps: string[];
}
export function curriculum(profile: PlayerProfile): CurriculumNodeVM[] {
  const statuses = allStatuses(profile);
  return SKILL_TREE.map((n) => ({
    id: n.id, title: n.title, blurb: n.blurb, status: statuses[n.id],
    demonstrations: profile.skills[n.id]?.demonstrations ?? 0,
    masteryTarget: n.masteryTarget, decayed: profile.skills[n.id]?.decayed ?? false, deps: n.deps,
  }));
}

// ---- 06 Practice ----
import { scenariosFor, Scenario } from "./content";
import { scenariosForNode } from "../teaching/scenarioGen";
import { getCachedScenario } from "../teaching/content/cache";

export function pickScenario(profile: PlayerProfile, nodeId: string): Scenario | null {
  const score = profile.skills[nodeId]?.score ?? 0;
  const target: 1 | 2 | 3 = score < 0.4 ? 1 : score < 0.7 ? 2 : 3;

  const cached = getCachedScenario(nodeId, target);
  if (cached) return cached;

  const pool = [...scenariosForNode(nodeId), ...scenariosFor(nodeId)];
  if (!pool.length) return null;
  return pool.find((s) => s.difficulty === target) ?? pool[0];
}
export function gradeScenario(scenario: Scenario, played: { rank: string; suit: string }): { correct: boolean; explain: string } {
  const correct = scenario.correctCards.some((c) => c.rank === played.rank && c.suit === played.suit);
  return { correct, explain: scenario.explainCorrect };
}

// ---- 09 Round results ----
export function latestRound(state: GameState) { return state.history[state.history.length - 1] ?? null; }

// ---- 10 Game Report ----
export interface GameReportData {
  result: "win" | "loss" | "tie";
  finalScores: Record<Team, number>;
  strengths: { id: string; title: string }[];
  weaknesses: { id: string; title: string }[];
  misconceptions: { label: string; explain: string; fixNode: string }[];
  improvement: { id: string; title: string; from: number; to: number }[] | null;
}
export function gameReport(profile: PlayerProfile, state: GameState, human: Team = "NS"): GameReportData {
  const opp: Team = human === "NS" ? "EW" : "NS";
  const result = state.scores[human] === state.scores[opp] ? "tie" : state.scores[human] > state.scores[opp] ? "win" : "loss";
  const active = Object.values(profile.misconceptions)
    .filter((m) => !m.resolved).sort((a, b) => b.count - a.count).slice(0, 2)
    .map((m) => ({ label: MISCONCEPTIONS[m.id]?.label ?? m.id, explain: MISCONCEPTIONS[m.id]?.explain ?? "", fixNode: MISCONCEPTIONS[m.id]?.fixNode ?? "" }));

  let improvement: GameReportData["improvement"] = null;
  if (profile.snapshots.length >= 1) {
    const prev = profile.snapshots[profile.snapshots.length - 1].scores;
    improvement = SKILL_TREE
      .filter((n) => (profile.skills[n.id]?.score ?? 0) !== (prev[n.id] ?? 0))
      .map((n) => ({ id: n.id, title: n.title, from: Math.round((prev[n.id] ?? 0) * 100), to: Math.round((profile.skills[n.id]?.score ?? 0) * 100) }))
      .sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 4);
  }
  return {
    result, finalScores: state.scores,
    strengths: strengths(profile, 3).map((id) => ({ id, title: nodeById(id)?.title ?? id })),
    weaknesses: weaknesses(profile, 3).map((id) => ({ id, title: nodeById(id)?.title ?? id })),
    misconceptions: active, improvement,
  };
}

// ---- 11 Progress ----
export interface ProgressData {
  masteryOverTime: { ts: number; pct: number }[];
  nodes: CurriculumNodeVM[];
  review: { id: string; title: string }[];
  games: { ts: number; label: string }[];
}
export function progress(profile: PlayerProfile): ProgressData {
  return {
    masteryOverTime: profile.snapshots.map((s) => ({
      ts: s.ts, pct: Math.round((Object.values(s.scores).filter((v) => v >= 0.7).length / SKILL_TREE.length) * 100),
    })),
    nodes: curriculum(profile),
    review: needsReview(profile).map((id) => ({ id, title: nodeById(id)?.title ?? id })),
    games: profile.snapshots.map((s) => ({ ts: s.ts, label: s.label })),
  };
}
