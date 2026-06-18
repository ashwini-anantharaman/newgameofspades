import React, { useState } from 'react';
import { ONBOARDING } from '@/lib/store/content';
import { curriculum } from '@/lib/store/selectors';
import { useSpadesStore } from '@/lib/store/SpadesProvider';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { profile, completeOnboarding } = useSpadesStore();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [showFeedback, setShowFeedback] = useState(false);

  const q0 = ONBOARDING[0];
  const q1 = ONBOARDING[1];
  const preview = curriculum(profile).slice(0, 3);

  const handleExperience = (idx: number) => {
    setPicks((p) => ({ ...p, experience: idx }));
    setTimeout(() => setStep(1), 400);
  };

  const handleQuiz = (idx: number) => {
    const nextPicks = { ...picks, trump: idx };
    setPicks(nextPicks);
    setShowFeedback(true);
    completeOnboarding(nextPicks);
    setTimeout(() => setStep(2), 1200);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col items-center justify-center px-6">
      <div className="flex gap-2 mb-12">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#14564A]' : i < step ? 'w-4 bg-[#E6B24A]' : 'w-4 bg-[#E3E8E6]'
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#15110C] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {q0.question}
            </h2>
            <p className="text-[#7E8A86] text-sm">We'll tailor your learning path</p>
          </div>
          <div className="w-full flex flex-col gap-3">
            {q0.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleExperience(i)}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-[16px] border-2 text-left transition-all duration-200
                  ${picks.experience === i
                    ? 'border-[#E6B24A] bg-[#E6B24A]/10'
                    : 'border-[#E3E8E6] bg-[#FBF7EE] hover:border-[#14564A]/30 hover:bg-[#FBF7EE]'
                  }
                `}
              >
                <span className="text-2xl">{i === 0 ? '🌱' : i === 1 ? '🃏' : '♠'}</span>
                <div>
                  <div className="font-semibold text-[#15110C]">{opt.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-2">Quick skill check</div>
            <h2 className="text-xl font-bold text-[#15110C] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {q1.question}
            </h2>
          </div>
          <div className="w-full grid grid-cols-1 gap-3">
            {q1.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => !showFeedback && handleQuiz(i)}
                className={`
                  p-3 rounded-[12px] border-2 text-sm font-medium transition-all duration-200
                  ${picks.trump === i && showFeedback
                    ? i === 1
                      ? 'border-[#14564A] bg-[#14564A] text-[#FBF7EE]'
                      : 'border-[#BD3B33] bg-[#BD3B33]/10 text-[#BD3B33]'
                    : i === 1 && showFeedback
                    ? 'border-[#14564A] bg-[#14564A]/10 text-[#14564A]'
                    : 'border-[#E3E8E6] bg-[#FBF7EE] text-[#15110C] hover:border-[#14564A]/30'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#E6B24A] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-xl text-[#15110C]">◈</span>
            </div>
            <h2 className="text-2xl font-bold text-[#15110C] mb-2" style={{ fontFamily: 'var(--font-display)' }}>Your path is ready</h2>
            <p className="text-[#7E8A86] text-sm">Starting from Suits & Ranking — 12 concepts to master</p>
          </div>

          <div className="w-full bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-4">
            <div className="flex flex-col gap-3">
              {preview.map((node) => (
                <div key={node.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${node.status !== 'locked' ? 'bg-[#FBF7EE] border-2 border-[#E6B24A] shadow-[0_0_8px_rgba(230,178,74,0.4)]' : 'bg-[#E3E8E6]'}
                  `}>
                    {node.status === 'locked' ? <span className="text-xs text-[#7E8A86]">🔒</span> : <span className="text-[#E6B24A]">◈</span>}
                  </div>
                  <div className={`text-sm ${node.status !== 'locked' ? 'text-[#14564A] font-semibold' : 'text-[#7E8A86]'}`}>
                    {node.title}
                  </div>
                  {node.status === 'available' && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#E6B24A] font-medium">Start</span>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onComplete}
            className="w-full bg-[#14564A] hover:bg-[#0C3128] text-[#FBF7EE] font-bold py-4 rounded-[999px] transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Go to dashboard →
          </button>
        </div>
      )}
    </div>
  );
}
