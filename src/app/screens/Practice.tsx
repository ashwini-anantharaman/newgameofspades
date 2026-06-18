import React, { useEffect, useMemo, useState } from 'react';
import { TrickReveal } from '../components/TrickReveal';
import { PlayingCard } from '../components/PlayingCard';
import { MasteryMeter } from '../components/MasteryMeter';
import { gradeScenario } from '@/lib/store/selectors';
import { REVEAL_AFTER_ATTEMPTS, gentleWorkflowWrongMessage } from '@/lib/teaching/coach';
import { useSpadesStore } from '@/lib/store/SpadesProvider';
import { curriculum } from '@/lib/store/selectors';
import { useNodeScenario } from '@/lib/teaching/content/useNodeContent';

interface PracticeProps {
  onBack: () => void;
  onNext: () => void;
}

type FeedbackType = 'strong' | 'weak' | null;

export function Practice({ onBack, onNext }: PracticeProps) {
  const { profile, activeNodeId, observe, completePractice } = useSpadesStore();
  const node = curriculum(profile).find((n) => n.id === activeNodeId);
  const difficulty = useMemo((): 1 | 2 | 3 => {
    const score = profile.skills[activeNodeId]?.score ?? 0;
    return score < 0.4 ? 1 : score < 0.7 ? 2 : 3;
  }, [profile, activeNodeId]);

  const { scenario, loading, source } = useNodeScenario(activeNodeId, difficulty);
  const [solved, setSolved] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastPick, setLastPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explain: string } | null>(null);
  const feedbackType: FeedbackType = feedback?.correct ? 'strong' : feedback ? 'weak' : null;

  useEffect(() => {
    setSolved(false);
    setWrongCount(0);
    setLastPick(null);
    setFeedback(null);
  }, [activeNodeId, scenario?.id]);

  if (loading || !scenario) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center gap-3 text-[#7E8A86]">
        <div className="w-8 h-8 border-2 border-[#14564A] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Building your practice scenario…</p>
      </div>
    );
  }

  const handleSelect = (idx: number) => {
    if (solved) return;
    const card = scenario.hand[idx];
    const result = gradeScenario(scenario, card);
    setLastPick(idx);
    const attempt = result.correct ? 0 : wrongCount + 1;
    const reveal = result.correct || attempt >= REVEAL_AFTER_ATTEMPTS;
    setFeedback({
      correct: result.correct,
      explain: reveal ? result.explain : gentleWorkflowWrongMessage(REVEAL_AFTER_ATTEMPTS - attempt),
    });
    observe({
      nodeIds: [scenario.nodeId],
      correct: result.correct,
      prompted: false,
      note: result.explain,
    });
    if (result.correct) {
      setSolved(true);
      completePractice(scenario.nodeId);
    } else {
      setWrongCount(attempt);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pb-20 lg:pb-0">
      <div className="px-6 py-4 border-b border-[#E3E8E6] bg-[#FBF7EE] flex items-center gap-4">
        <button onClick={onBack} className="text-[#7E8A86] hover:text-[#15110C] text-sm">← Back</button>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">Practice Scenario</div>
          <div className="font-semibold text-[#15110C] text-sm" style={{ fontFamily: 'var(--font-display)' }}>{node?.title ?? scenario.nodeId}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MasteryMeter current={node?.demonstrations ?? 0} total={node?.masteryTarget ?? 3} size="sm" />
          {source === 'ai' && <span className="text-[9px] text-[#14564A]">AI scenario</span>}
          {source === 'cache' && <span className="text-[9px] text-[#14564A]">Saved AI drill</span>}
          {source === 'static' && <span className="text-[9px] text-[#C49135]">Built-in</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
          <div className="bg-[#14564A] text-[#FBF7EE] rounded-[16px] p-5">
            <div className="text-[10px] uppercase tracking-widest text-[#FBF7EE]/50 mb-2">Your turn</div>
            <p className="text-sm leading-relaxed">{scenario.prompt}</p>
          </div>

          <div className="bg-[#0C3128] rounded-[16px] p-5 relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                {!scenario.spadesBroken && (
                  <div className="bg-[#BD3B33] text-white text-[10px] px-2.5 py-1 rounded-full font-medium">♠ Not broken</div>
                )}
                {scenario.ledSuit && (
                  <div className="bg-[#14564A] text-[#FBF7EE] text-[10px] px-2.5 py-1 rounded-full font-medium">Led: {scenario.ledSuit}</div>
                )}
              </div>
              {scenario.trick.length > 0 ? (
                <TrickReveal trick={scenario.trick} />
              ) : (
                <div className="text-[#FBF7EE]/40 text-xs py-4">You&apos;re leading this trick</div>
              )}
              <div className="text-[#FBF7EE]/40 text-[9px] mt-1">YOU — choose a card</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Your hand — tap to play</div>
            <div className="flex gap-2 flex-wrap justify-center">
              {scenario.hand.map((card, i) => {
                let state: 'default' | 'legal' | 'illegal' | 'winner' = 'legal';
                if (solved && lastPick === i) state = 'winner';
                return (
                  <PlayingCard
                    key={i}
                    suit={card.suit}
                    rank={card.rank}
                    size="lg"
                    state={state}
                    onClick={!solved ? () => handleSelect(i) : undefined}
                  />
                );
              })}
            </div>
            {!solved && wrongCount > 0 && wrongCount < REVEAL_AFTER_ATTEMPTS && (
              <p className="text-center text-[#7E8A86] text-xs mt-3">Keep trying — the answer unlocks after three attempts.</p>
            )}
          </div>

          {feedback && (
            <div className={`rounded-[16px] p-5 border-2 ${feedbackType === 'strong' ? 'bg-[#14564A]/10 border-[#14564A]' : 'bg-[#BD3B33]/10 border-[#BD3B33]'}`}>
              <div className={`text-[11px] uppercase tracking-widest mb-2 font-bold ${feedbackType === 'strong' ? 'text-[#14564A]' : 'text-[#BD3B33]'}`}>
                {feedbackType === 'strong' ? '✓ Strong play' : '✗ Not quite — try again'}
              </div>
              <p className="text-[#15110C] text-sm leading-relaxed">{feedback.explain}</p>
            </div>
          )}

          {solved && (
            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 py-3 rounded-[999px] border border-[#E3E8E6] text-[#15110C] text-sm font-medium hover:bg-[#F4F6F5] transition-colors">← Back to tree</button>
              <button onClick={onNext} className="flex-1 py-3 rounded-[999px] bg-[#14564A] text-[#FBF7EE] font-bold text-sm hover:bg-[#0C3128] transition-colors">Done →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
