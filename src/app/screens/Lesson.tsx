import React, { useEffect, useState } from 'react';
import { TrickReveal } from '../components/TrickReveal';
import { PlayingCard } from '../components/PlayingCard';
import { useNodeLesson } from '@/lib/teaching/content/useNodeContent';
import { useSpadesStore } from '@/lib/store/SpadesProvider';

interface LessonProps {
  onNext: () => void;
  onBack: () => void;
}

const VISUAL_DEMOS = new Set(['rankRow', 'breakingDemo', 'trumpTrick', 'followDemo', 'cheapWin', 'duckDemo', 'bagDemo', 'nilDemo', 'setDemo']);

function TrickDemo({ demo }: { demo: string }) {
  const phase = demo.includes('break') ? 'break' : demo.includes('trump') ? 'strategy' : demo.includes('rank') ? 'rank' : 'intro';
  return (
    <div className="bg-[#14564A] rounded-[16px] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)' }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        {phase === 'rank' ? (
          <div className="flex gap-3 items-end">
            <PlayingCard suit="hearts" rank="K" size="md" />
            <PlayingCard suit="hearts" rank="A" size="md" state="winner" />
            <PlayingCard suit="hearts" rank="5" size="md" />
          </div>
        ) : (
          <>
            <div className="flex gap-1">
              <PlayingCard suit="hearts" rank="K" faceDown size="sm" />
              <PlayingCard suit="hearts" rank="9" faceDown size="sm" />
            </div>
            <div className="flex items-center gap-8 w-full justify-center">
              <PlayingCard suit="clubs" rank="J" faceDown size="sm" />
              <div className="w-24 h-16 bg-[#0C3128]/50 rounded-xl flex items-center justify-center gap-1">
                {phase === 'break' && (
                  <>
                    <PlayingCard suit="hearts" rank="7" size="sm" />
                    <PlayingCard suit="spades" rank="2" size="sm" state="winner" />
                  </>
                )}
                {phase === 'strategy' && <PlayingCard suit="spades" rank="A" size="sm" state="winner" />}
              </div>
              <PlayingCard suit="diamonds" rank="Q" faceDown size="sm" />
            </div>
            <div className="flex gap-1">
              <PlayingCard suit="spades" rank="Q" size="sm" />
              <PlayingCard suit="clubs" rank="8" size="sm" />
            </div>
          </>
        )}
        <div className="text-[#FBF7EE]/50 text-[10px] uppercase tracking-wider">You (South)</div>
      </div>
    </div>
  );
}

function demoTrickFor(demo: string): { seat: string; card: { suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'; rank: string } }[] {
  switch (demo) {
    case 'followDemo':
      return [
        { seat: 'W', card: { suit: 'hearts', rank: 'K' } },
        { seat: 'N', card: { suit: 'hearts', rank: '9' } },
      ];
    case 'countDemo':
    case 'bidDemo':
      return [];
    default:
      return [
        { seat: 'W', card: { suit: 'clubs', rank: 'J' } },
        { seat: 'N', card: { suit: 'hearts', rank: '7' } },
        { seat: 'E', card: { suit: 'diamonds', rank: 'Q' } },
      ];
  }
}

export function Lesson({ onNext, onBack }: LessonProps) {
  const { activeNodeId, completeLesson } = useSpadesStore();
  const { lesson, loading, source, apiError, refresh, generating } = useNodeLesson(activeNodeId);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [activeNodeId, lesson?.nodeId]);

  if (loading || !lesson) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center gap-3 text-[#7E8A86]">
        <div className="w-8 h-8 border-2 border-[#14564A] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading lesson…</p>
      </div>
    );
  }

  const current = lesson.steps[step];
  const showDemo = VISUAL_DEMOS.has(current.demo);
  const demoTrick = demoTrickFor(current.demo);

  const handleNext = () => {
    if (step < lesson.steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      completeLesson(activeNodeId);
      onNext();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pb-20 lg:pb-0">
      <div className="px-6 py-4 border-b border-[#E3E8E6] bg-[#FBF7EE] flex items-center gap-4">
        <button onClick={onBack} className="text-[#7E8A86] hover:text-[#15110C] text-sm flex items-center gap-1">← Back</button>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">Lesson</div>
          <div className="font-semibold text-[#15110C] text-sm" style={{ fontFamily: 'var(--font-display)' }}>{lesson.title}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-[11px] text-[#7E8A86] uppercase tracking-wider">Step {step + 1} of {lesson.steps.length}</div>
          {source === 'ai' && <span className="text-[9px] text-[#14564A]">AI tailored</span>}
          {source === 'cache' && <span className="text-[9px] text-[#14564A]">Saved AI lesson</span>}
          {source === 'static' && !generating && <span className="text-[9px] text-[#C49135]">Built-in</span>}
          {generating && <span className="text-[9px] text-[#7E8A86] animate-pulse">Generating AI…</span>}
        </div>
      </div>

      {apiError && (
        <div className="mx-6 mt-4 bg-[#E6B24A]/10 border border-[#E6B24A]/30 rounded-[12px] px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-[#15110C] text-xs leading-relaxed flex-1">{apiError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-[#14564A] text-xs font-semibold whitespace-nowrap hover:underline"
          >
            Regenerate
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-6">
          {showDemo && <TrickDemo demo={current.demo} />}
          {!showDemo && demoTrick.length > 0 && (
            <div className="bg-[#14564A] rounded-[16px] p-6">
              <TrickReveal key={`${step}-${current.demo}`} trick={demoTrick} paceMs={1000} />
            </div>
          )}
          <h2 className="text-xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>{current.heading}</h2>
          <p className="text-[#15110C] text-sm leading-relaxed">{current.body}</p>
          <div className="bg-[#E6B24A]/10 border-l-4 border-[#E6B24A] rounded-r-[12px] p-4">
            <div className="text-[10px] uppercase tracking-widest text-[#C49135] mb-1 font-medium">Key takeaway</div>
            <p className="text-[#15110C] text-sm font-medium leading-snug">{current.takeaway}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E3E8E6] bg-[#FBF7EE] px-6 py-4 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="px-5 py-2.5 rounded-[999px] border border-[#E3E8E6] text-[#15110C] text-sm font-medium hover:bg-[#F4F6F5] transition-colors">← Back</button>
        )}
        <div className="flex-1" />
        <button onClick={handleNext} className="bg-[#14564A] hover:bg-[#0C3128] text-[#FBF7EE] font-bold px-6 py-2.5 rounded-[999px] text-sm transition-colors">
          {step < lesson.steps.length - 1 ? 'Got it, next →' : 'Practice now →'}
        </button>
      </div>
    </div>
  );
}
