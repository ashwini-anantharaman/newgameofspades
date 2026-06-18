import { PlayerProfile, emptyProfile } from "../teaching/profile";
import { SKILL_TREE } from "../teaching/skillTree";
import type { PlayMode } from "../teaching/coach";

export interface Settings {
  playMode: PlayMode;
  reducedMotion: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { playMode: "Guided", reducedMotion: false, sound: true };

const KEYS = { profile: "spades.profile", settings: "spades.settings", session: "spades.session" };

function migrateSettings(raw: unknown): Settings {
  const s = raw as Partial<Settings & { intensity?: string }>;
  if (s.playMode === "Guided" || s.playMode === "Hard" || s.playMode === "Solo") {
    return {
      playMode: s.playMode,
      reducedMotion: s.reducedMotion ?? false,
      sound: s.sound ?? true,
    };
  }
  const legacy: Record<string, PlayMode> = { Quiet: "Solo", Balanced: "Guided", Chatty: "Guided" };
  return {
    playMode: legacy[s.intensity ?? ""] ?? DEFAULT_SETTINGS.playMode,
    reducedMotion: s.reducedMotion ?? false,
    sound: s.sound ?? true,
  };
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore quota */ }
}

export function loadProfile(): PlayerProfile {
  const p = safeGet<PlayerProfile | null>(KEYS.profile, null);
  if (!p || p.version !== 1) return emptyProfile();
  const lessonsCompleted = { ...(p.lessonsCompleted ?? {}) };
  const practicesCompleted = { ...(p.practicesCompleted ?? {}) };
  for (const n of SKILL_TREE) {
    const attempts = p.skills[n.id]?.attempts ?? 0;
    if (attempts >= 1 && !lessonsCompleted[n.id]) lessonsCompleted[n.id] = true;
    if (attempts >= 2 && !practicesCompleted[n.id]) practicesCompleted[n.id] = true;
  }
  return {
    ...emptyProfile(),
    ...p,
    lessonsCompleted,
    practicesCompleted,
  };
}
export function saveProfile(p: PlayerProfile): void { safeSet(KEYS.profile, p); }

export function loadSettings(): Settings {
  return migrateSettings(safeGet(KEYS.settings, DEFAULT_SETTINGS));
}
export function saveSettings(s: Settings): void { safeSet(KEYS.settings, s); }

export function resetAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}
