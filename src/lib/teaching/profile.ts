import { SKILL_TREE } from "./skillTree";

export interface SkillState {
  demonstrations: number; // unprompted correct applications
  attempts: number;
  score: number;          // 0..1 rolling competence
  lastSeen: number;       // session index last practiced
  decayed: boolean;       // flagged "needs review"
}

export interface MisconceptionState {
  id: string;
  count: number;
  lastSeen: number;
  resolved: boolean;
}

export interface HistoryEntry {
  ts: number;
  nodeId: string;
  correct: boolean;
  prompted: boolean;
  note?: string;
}

export interface PlayerProfile {
  version: 1;
  session: number;
  skills: Record<string, SkillState>;
  misconceptions: Record<string, MisconceptionState>;
  history: HistoryEntry[];
  snapshots: { ts: number; label: string; scores: Record<string, number> }[];
  /** Lesson screen finished for this node — unlocks dependent nodes. */
  lessonsCompleted: Record<string, boolean>;
  /** At least one practice scenario finished for this node. */
  practicesCompleted: Record<string, boolean>;
}

export interface Observation {
  nodeIds: string[];
  correct: boolean;
  prompted: boolean;       // was a hint shown before the move?
  misconceptionId?: string;
  note?: string;
}

export function emptyProfile(): PlayerProfile {
  const skills: Record<string, SkillState> = {};
  for (const n of SKILL_TREE) skills[n.id] = { demonstrations: 0, attempts: 0, score: 0, lastSeen: 0, decayed: false };
  return { version: 1, session: 1, skills, misconceptions: {}, history: [], snapshots: [], lessonsCompleted: {}, practicesCompleted: {} };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Pure reducer: fold one observation into the profile. */
export function applyObservation(profile: PlayerProfile, obs: Observation): PlayerProfile {
  const skills = { ...profile.skills };
  for (const id of obs.nodeIds) {
    const s = { ...(skills[id] ?? { demonstrations: 0, attempts: 0, score: 0, lastSeen: 0, decayed: false }) };
    s.attempts += 1;
    s.lastSeen = profile.session;
    s.decayed = false;
    if (obs.correct) {
      // small steps so one move doesn't swing mastery
      s.score = clamp01(s.score + 0.12);
      if (!obs.prompted) s.demonstrations += 1; // only unprompted counts toward mastery
    } else {
      s.score = clamp01(s.score - 0.15);
    }
    skills[id] = s;
  }

  const misconceptions = { ...profile.misconceptions };
  if (obs.misconceptionId) {
    const m = misconceptions[obs.misconceptionId] ?? { id: obs.misconceptionId, count: 0, lastSeen: 0, resolved: false };
    misconceptions[obs.misconceptionId] = { ...m, count: m.count + 1, lastSeen: profile.session, resolved: false };
  }

  const history = [
    ...profile.history,
    ...obs.nodeIds.map((nodeId) => ({ ts: Date.now(), nodeId, correct: obs.correct, prompted: obs.prompted, note: obs.note })),
  ];

  return { ...profile, skills, misconceptions, history };
}

/** Derived strengths / weaknesses for reports. */
export function strengths(profile: PlayerProfile, n = 3): string[] {
  return Object.entries(profile.skills)
    .filter(([, s]) => s.attempts > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, n).map(([id]) => id);
}

export function weaknesses(profile: PlayerProfile, n = 3): string[] {
  return Object.entries(profile.skills)
    .filter(([, s]) => s.attempts > 0)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, n).map(([id]) => id);
}

export function snapshot(profile: PlayerProfile, label: string): PlayerProfile {
  const scores: Record<string, number> = {};
  for (const [id, s] of Object.entries(profile.skills)) scores[id] = s.score;
  return { ...profile, snapshots: [...profile.snapshots, { ts: Date.now(), label, scores }] };
}
