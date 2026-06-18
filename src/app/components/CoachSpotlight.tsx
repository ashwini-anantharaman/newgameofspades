import React from 'react';
import { PlayingCard } from './PlayingCard';
import type { QuizOption } from '@/lib/teaching/quiz';

interface SpotlightAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface CoachSpotlightProps {
  text: string;
  pending?: boolean;
  quiz?: {
    stepId?: string;
    question?: string;
    options: QuizOption[];
    answeredId?: string;
    feedback?: string;
    verdict?: 'strong' | 'weak';
    onSelect?: (optionId: string) => void;
    onProceed?: () => void;
    proceedLabel?: string;
  };
  actions?: SpotlightAction[];
}

export function CoachSpotlight({ text, pending, quiz, actions }: CoachSpotlightProps) {
  const revealed = Boolean(quiz?.answeredId);
  const hasWorkflow = Boolean(quiz && (quiz.options.length > 0 || quiz.stepId === 'hand-only'));
  const isCardPick = quiz?.stepId === 'pick-card';
  const isBidPick = quiz?.stepId === 'pick-bid';

  return (
    <div className="mx-4 mt-3 mb-1 rounded-[20px] border border-[#E6B24A]/40 bg-[#FBF7EE] shadow-lg shadow-black/20 overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#14564A] text-[#FBF7EE]">
        <div className="w-8 h-8 rounded-full bg-[#E6B24A] flex items-center justify-center flex-shrink-0">
          <span className="text-sm">♠</span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider">Coach</div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {text && (
          <div className="bg-[#F4F6F5] border border-[#E3E8E6] rounded-[14px] px-3.5 py-3">
            <div className="text-[9px] uppercase tracking-widest text-[#7E8A86] mb-1 font-medium">Hint</div>
            {pending ? (
              <span className="inline-flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-[#7E8A86] rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-[#7E8A86] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#7E8A86] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            ) : (
              <p className="text-[#15110C] text-base leading-relaxed">{text}</p>
            )}
          </div>
        )}

        {hasWorkflow && !pending && (
          <div className="bg-white border-2 border-[#14564A]/25 rounded-[14px] px-3.5 py-3.5">
            <div className="text-[9px] uppercase tracking-widest text-[#14564A] mb-1.5 font-bold">Your move</div>
            <p className="text-[#15110C] text-base font-semibold mb-3">{quiz?.question}</p>

            {quiz!.options.length > 0 ? (
              <div className="flex flex-col gap-2">
                {quiz!.options.map((opt) => {
                  const picked = quiz!.answeredId === opt.id;
                  let style =
                    'border-2 border-[#E3E8E6] bg-[#FBF7EE] text-[#15110C] hover:border-[#14564A] hover:bg-[#F4F6F5] active:scale-[0.99]';
                  if (revealed && opt.correct) {
                    style = 'border-2 border-[#14564A] bg-[#14564A]/10 text-[#14564A]';
                  } else if (revealed && picked && !opt.correct) {
                    style = 'border-2 border-[#BD3B33] bg-[#BD3B33]/10 text-[#BD3B33]';
                  } else if (revealed) {
                    style = 'border-2 border-[#E3E8E6] bg-[#F4F6F5] text-[#7E8A86] opacity-60';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => quiz!.onSelect?.(opt.id)}
                      className={`text-left text-sm font-medium px-3 py-2.5 rounded-[14px] transition-all disabled:cursor-default ${style}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isCardPick && opt.card && (
                          <PlayingCard suit={opt.card.suit} rank={opt.card.rank} size="sm" />
                        )}
                        {isBidPick && opt.bid !== undefined && (
                          <div className="w-10 h-14 rounded-[7px] bg-[#E6B24A] text-[#15110C] flex items-center justify-center font-bold text-base flex-shrink-0">
                            {opt.bid === 0 ? 'nil' : opt.bid}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div>{opt.label}</div>
                          {revealed && (
                            <div className="text-[#7E8A86] text-xs mt-1 leading-snug font-normal">{opt.feedback}</div>
                          )}
                        </div>
                        {revealed && opt.correct && <span className="text-[#14564A] text-lg">✓</span>}
                        {revealed && picked && !opt.correct && <span className="text-[#BD3B33] text-lg">✗</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#7E8A86] text-sm">Tap a highlighted card in your hand below.</p>
            )}

            {quiz?.feedback && !revealed && (
              <p className="text-[#15110C] text-sm mt-3 pt-3 border-t border-[#E3E8E6] leading-relaxed">{quiz.feedback}</p>
            )}

            {quiz?.verdict && revealed && (
              <p className={`text-sm font-semibold mt-3 ${quiz.verdict === 'strong' ? 'text-[#14564A]' : 'text-[#BD3B33]'}`}>
                {quiz.verdict === 'strong' ? 'Strong play.' : 'Not the best line.'}
              </p>
            )}

            {revealed && quiz?.onProceed && (
              <button
                type="button"
                onClick={quiz.onProceed}
                className="mt-3 w-full py-3 rounded-[14px] bg-[#E6B24A] text-[#15110C] font-bold text-sm hover:bg-[#C49135] transition-colors"
              >
                {quiz.proceedLabel ?? 'Continue'}
              </button>
            )}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={`flex-1 text-sm font-semibold px-4 py-3 rounded-[14px] transition-colors ${
                  a.variant === 'primary'
                    ? 'bg-[#14564A] text-[#FBF7EE] hover:bg-[#0C3128]'
                    : 'border-2 border-[#14564A] text-[#14564A] hover:bg-[#14564A]/10'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
