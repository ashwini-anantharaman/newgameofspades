import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlayerProfile, Observation } from '@/lib/teaching/profile';
import { applyObservation, snapshot, emptyProfile } from '@/lib/teaching/profile';
import { startSession } from '@/lib/teaching/scheduler';
import type { PlayMode } from '@/lib/teaching/coach';
import type { GameState } from '@/lib/engine/types';
import { seedProfileFromOnboarding } from '@/lib/store/selectors';
import {
  loadProfile,
  saveProfile,
  loadSettings,
  saveSettings,
  resetAll,
  type Settings,
} from '@/lib/store/persistence';

interface SpadesContextValue {
  profile: PlayerProfile;
  settings: Settings;
  gamesPlayed: number;
  lastGame: GameState | null;
  activeNodeId: string;
  setActiveNodeId: (id: string) => void;
  observe: (obs: Observation) => void;
  saveProfileNow: (p: PlayerProfile) => void;
  completeOnboarding: (picks: Record<string, number>) => void;
  completeLesson: (nodeId: string) => void;
  completePractice: (nodeId: string) => void;
  completeGame: (state: GameState, label: string) => void;
  setLastGame: (state: GameState) => void;
  setPlayMode: (playMode: PlayMode) => void;
  setReducedMotion: (v: boolean) => void;
  setSound: (v: boolean) => void;
  resetProgress: () => void;
}

const SpadesContext = createContext<SpadesContextValue | null>(null);

const GAMES_KEY = 'spades.gamesPlayed';

function loadGamesPlayed(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(GAMES_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function saveGamesPlayed(n: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(GAMES_KEY, String(n));
}

export function SpadesProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [gamesPlayed, setGamesPlayed] = useState(loadGamesPlayed);
  const [lastGame, setLastGameState] = useState<GameState | null>(null);
  const [activeNodeId, setActiveNodeId] = useState('breaking');

  useEffect(() => {
    setProfile((p) => {
      const next = startSession(p);
      saveProfile(next);
      return next;
    });
  }, []);

  const saveProfileNow = useCallback((p: PlayerProfile) => {
    setProfile(p);
    saveProfile(p);
  }, []);

  const observe = useCallback((obs: Observation) => {
    setProfile((p) => {
      const next = applyObservation(p, obs);
      saveProfile(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((picks: Record<string, number>) => {
    setProfile((p) => {
      const next = seedProfileFromOnboarding(p, picks);
      saveProfile(next);
      return next;
    });
  }, []);

  const completeLesson = useCallback((nodeId: string) => {
    setProfile((p) => {
      const next = applyObservation(p, {
        nodeIds: [nodeId],
        correct: true,
        prompted: false,
        note: "Lesson completed",
      });
      const updated: PlayerProfile = {
        ...next,
        lessonsCompleted: { ...next.lessonsCompleted, [nodeId]: true },
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const completePractice = useCallback((nodeId: string) => {
    setProfile((p) => {
      const updated: PlayerProfile = {
        ...p,
        practicesCompleted: { ...p.practicesCompleted, [nodeId]: true },
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const setLastGame = useCallback((state: GameState) => {
    setLastGameState(state);
  }, []);

  const completeGame = useCallback(
    (state: GameState, label: string) => {
      setLastGameState(state);
      setProfile((p) => {
        const next = snapshot(p, label);
        saveProfile(next);
        return next;
      });
      setGamesPlayed((g) => {
        const n = g + 1;
        saveGamesPlayed(n);
        return n;
      });
    },
    [],
  );

  const setPlayMode = useCallback((playMode: PlayMode) => {
    setSettings((s) => {
      const next = { ...s, playMode };
      saveSettings(next);
      return next;
    });
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setSettings((s) => {
      const next = { ...s, reducedMotion };
      saveSettings(next);
      return next;
    });
  }, []);

  const setSound = useCallback((sound: boolean) => {
    setSettings((s) => {
      const next = { ...s, sound };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    resetAll();
    localStorage.removeItem(GAMES_KEY);
    setProfile(emptyProfile());
    setSettings(loadSettings());
    setGamesPlayed(0);
    setLastGameState(null);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      settings,
      gamesPlayed,
      lastGame,
      activeNodeId,
      setActiveNodeId,
      observe,
      saveProfileNow,
      completeOnboarding,
      completeLesson,
      completePractice,
      completeGame,
      setLastGame,
      setPlayMode,
      setReducedMotion,
      setSound,
      resetProgress,
    }),
    [
      profile,
      settings,
      gamesPlayed,
      lastGame,
      activeNodeId,
      observe,
      saveProfileNow,
      completeOnboarding,
      completeLesson,
      completePractice,
      completeGame,
      setLastGame,
      setPlayMode,
      setReducedMotion,
      setSound,
      resetProgress,
    ],
  );

  return <SpadesContext.Provider value={value}>{children}</SpadesContext.Provider>;
}

export function useSpadesStore(): SpadesContextValue {
  const ctx = useContext(SpadesContext);
  if (!ctx) throw new Error('useSpadesStore must be used within SpadesProvider');
  return ctx;
}

/** Short labels for skill-tree nodes (UI layout preserved from prototype). */
export const NODE_LABELS: Record<string, string> = {
  suits: 'Suits',
  trick: 'Tricks',
  follow: 'Follow suit',
  trump: 'Trump',
  breaking: 'Breaking ♠',
  bid_basics: 'Bidding',
  count_bid: 'Count bid',
  high_spades: 'High ♠',
  partner: 'Partner',
  bags: 'Bags',
  nil: 'Nil',
  setting: 'Set them',
};

export function nodeStateToSkillNode(
  status: 'locked' | 'available' | 'in-progress' | 'mastered',
): 'locked' | 'available' | 'in-progress' | 'mastered' {
  return status;
}
