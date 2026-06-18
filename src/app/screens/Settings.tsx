import React, { useState } from 'react';
import { PLAY_MODE_META, type PlayMode } from '@/lib/teaching/coach';
import { useSpadesStore } from '@/lib/store/SpadesProvider';

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { settings, setPlayMode, setReducedMotion, setSound, resetProgress } = useSpadesStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${value ? 'bg-[#14564A]' : 'bg-[#E3E8E6]'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">{title}</div>
      <div className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] overflow-hidden">
        {children}
      </div>
    </div>
  );

  const Row = ({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E3E8E6] last:border-0">
      <div>
        <div className="text-sm font-medium text-[#15110C]">{label}</div>
        {sub && <div className="text-xs text-[#7E8A86] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:pb-8 max-w-lg">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-1">Settings</div>
        <h1 className="text-2xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>Preferences</h1>
      </div>

      <Section title="Play mode">
        <Row
          label="Default phase"
          sub="Guided quizzes → Hard questions → Solo vs AI"
          right={
            <div className="flex flex-col items-end gap-1">
              {(['Guided', 'Hard', 'Solo'] as PlayMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPlayMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-[999px] transition-colors w-full text-right ${
                    settings.playMode === m ? 'bg-[#14564A] text-[#FBF7EE] font-medium' : 'text-[#7E8A86]'
                  }`}
                >
                  Phase {PLAY_MODE_META[m].phase}: {m}
                </button>
              ))}
            </div>
          }
        />
      </Section>

      <Section title="Accessibility">
        <Row label="Reduced motion" sub="Fewer animations" right={<Toggle value={settings.reducedMotion} onChange={setReducedMotion} />} />
        <Row label="Sound effects" sub="Card and UI sounds" right={<Toggle value={settings.sound} onChange={setSound} />} />
      </Section>

      <Section title="Data">
        <Row
          label="Reset progress"
          sub="Clears skill tree, games, and settings"
          right={
            showResetConfirm ? (
              <div className="flex gap-2">
                <button onClick={() => setShowResetConfirm(false)} className="text-xs text-[#7E8A86] px-2 py-1">Cancel</button>
                <button
                  onClick={() => { resetProgress(); setShowResetConfirm(false); onNavigate('landing'); }}
                  className="text-xs text-[#BD3B33] font-semibold px-2 py-1"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button onClick={() => setShowResetConfirm(true)} className="text-xs text-[#BD3B33] font-medium px-3 py-1.5 border border-[#BD3B33]/30 rounded-[999px]">
                Reset
              </button>
            )
          }
        />
      </Section>
    </div>
  );
}
