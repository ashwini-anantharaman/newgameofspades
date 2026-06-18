import { PlayerProfile } from "./profile";
import { SKILL_TREE, isMastered } from "./skillTree";

// Review cadence in sessions, indexed loosely by competence.
const INTERVALS = [1, 3, 7, 14];

function nextInterval(score: number): number {
  const idx = Math.min(INTERVALS.length - 1, Math.floor(score * INTERVALS.length));
  return INTERVALS[idx];
}

/** Call at session start: flag mastered/seen skills that are due for review. */
export function applyDecay(profile: PlayerProfile): PlayerProfile {
  const skills = { ...profile.skills };
  for (const n of SKILL_TREE) {
    const s = skills[n.id];
    if (!s || s.attempts === 0) continue;
    const sessionsSince = profile.session - s.lastSeen;
    if (sessionsSince >= nextInterval(s.score)) skills[n.id] = { ...s, decayed: true };
  }
  return { ...profile, skills };
}

/** Skills due for review now. */
export function needsReview(profile: PlayerProfile): string[] {
  return SKILL_TREE.filter((n) => profile.skills[n.id]?.decayed).map((n) => n.id);
}

/** Begin a new learning session (bumps the session counter, then decays). */
export function startSession(profile: PlayerProfile): PlayerProfile {
  return applyDecay({ ...profile, session: profile.session + 1 });
}
