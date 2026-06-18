import React, { useState } from 'react';
import { SpadesProvider } from '@/lib/store/SpadesProvider';
import { NavRail, BottomTabs } from './components/NavRail';
import { Landing } from './screens/Landing';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { Curriculum } from './screens/Curriculum';
import { Lesson } from './screens/Lesson';
import { Practice } from './screens/Practice';
import { CoachGame } from './screens/CoachGame';
import { GameReport } from './screens/GameReport';
import { Progress } from './screens/Progress';
import { CoachApiBanner } from './components/CoachApiBanner';

type Screen =
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'curriculum'
  | 'lesson'
  | 'practice'
  | 'game'
  | 'report'
  | 'progress'
  | 'settings';

const SHELL_SCREENS: Screen[] = ['dashboard', 'curriculum', 'game', 'progress', 'settings', 'lesson', 'practice', 'report'];

const navMap: Record<string, Screen> = {
  landing: 'dashboard',
  curriculum: 'curriculum',
  game: 'game',
  progress: 'progress',
  settings: 'settings',
};

const screenToNav: Record<Screen, string> = {
  landing: 'landing',
  onboarding: 'landing',
  dashboard: 'landing',
  curriculum: 'curriculum',
  lesson: 'curriculum',
  practice: 'curriculum',
  game: 'game',
  report: 'game',
  progress: 'progress',
  settings: 'settings',
};

function AppShell() {
  const [screen, setScreen] = useState<Screen>('landing');

  const navigate = (id: string) => {
    const mapped = navMap[id] ?? (id as Screen);
    setScreen(mapped);
  };

  const goTo = (s: Screen) => setScreen(s);

  const showShell = SHELL_SCREENS.includes(screen);
  const usesCoachApi = screen === 'lesson' || screen === 'practice' || screen === 'game';

  return (
    <div className="min-h-screen w-full bg-[#F4F6F5]" style={{ fontFamily: 'var(--font-body)' }}>
      {showShell && (
        <>
          <NavRail current={screenToNav[screen]} onNavigate={navigate} />
          <BottomTabs current={screenToNav[screen]} onNavigate={navigate} />
        </>
      )}

      <CoachApiBanner show={usesCoachApi} />

      <div className={showShell ? 'lg:ml-[220px]' : ''}>
        {screen === 'landing' && (
          <Landing onStart={() => goTo('onboarding')} onSignIn={() => goTo('dashboard')} />
        )}
        {screen === 'onboarding' && (
          <Onboarding onComplete={() => goTo('dashboard')} />
        )}
        {screen === 'dashboard' && (
          <Dashboard onNavigate={(id) => goTo(id as Screen)} />
        )}
        {screen === 'curriculum' && (
          <Curriculum onNavigate={(id) => goTo(id as Screen)} />
        )}
        {screen === 'lesson' && (
          <Lesson onNext={() => goTo('practice')} onBack={() => goTo('curriculum')} />
        )}
        {screen === 'practice' && (
          <Practice onBack={() => goTo('curriculum')} onNext={() => goTo('curriculum')} />
        )}
        {screen === 'game' && (
          <CoachGame onNavigate={(id) => goTo(id as Screen)} />
        )}
        {screen === 'report' && (
          <GameReport onNavigate={(id) => goTo(id as Screen)} />
        )}
        {screen === 'progress' && (
          <Progress onNavigate={(id) => goTo(id as Screen)} />
        )}
        {screen === 'settings' && (
          <Settings onNavigate={(id) => goTo(id as Screen)} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SpadesProvider>
      <AppShell />
    </SpadesProvider>
  );
}
