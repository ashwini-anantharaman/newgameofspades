import React from 'react';
import { PlayingCard } from './PlayingCard';
import type { QuizOption } from '@/lib/teaching/quiz';

interface SpotlightAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface CoachBubbleProps {
  /** Contextual hint — supportive chat copy. */
  text: string;
  isUser?: boolean;
  isTyping?: boolean;
  compact?: boolean;
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

export function CoachBubble({
  text,
  isUser = false,
  isTyping = false,
  compact = false,
  quiz,
  actions,
}: CoachBubbleProps) {
  const textSize = compact ? 'text-xs' : 'text-sm';
  const answered = Boolean(quiz?.answeredId);
  const revealed = answered;
  const isCardPick = quiz?.stepId === 'pick-card';
  const isBidPick = quiz?.stepId === 'pick-bid';
  const hasWorkflow = Boolean(quiz && (quiz.options.length > 0 || quiz.stepId === 'hand-only'));

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={`max-w-[90%] bg-[#14564A] text-[#FBF7EE] rounded-[12px] rounded-tr-[4px] px-3 py-2 ${textSize}`}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 items-start ${compact ? 'opacity-75' : ''}`}>
      <div className="w-7 h-7 rounded-full bg-[#E6B24A] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs">♠</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        {!compact && <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7E8A86]">Coach</div>}

        {!compact && text && (
          <div className="bg-[#F4F6F5] border border-[#E3E8E6] rounded-[12px] px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-widest text-[#7E8A86] mb-1 font-medium">Hint</div>
            {isTyping ? (
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-[#7E8A86] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#7E8A86] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#7E8A86] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <p className={`text-[#15110C] leading-relaxed ${textSize}`}>{text}</p>
            )}
          </div>
        )}

        {compact && (
          <div className={`bg-[#FBF7EE] border border-[#E3E8E6] text-[#15110C] rounded-[12px] rounded-tl-[4px] px-2.5 py-1.5 ${textSize}`}>
            {isTyping ? '…' : text}
          </div>
        )}

        {hasWorkflow && !isTyping && (
          <div className="bg-white border-2 border-[#14564A]/25 rounded-[14px] px-3 py-3 shadow-sm">
            <div className="text-[9px] uppercase tracking-widest text-[#14564A] mb-1.5 font-bold">Your move</div>
            <p className="text-[#15110C] text-sm font-semibold mb-3">{quiz?.question}</p>

            {quiz!.options.length > 0 ? (
              <div className={isCardPick ? 'flex flex-col gap-2' : 'flex flex-col gap-2'}>
                {quiz!.options.map((opt) => {
                  const picked = quiz!.answeredId === opt.id;
                  let style =
                    'border-2 border-[#E3E8E6] bg-[#FBF7EE] text-[#15110C] hover:border-[#14564A] hover:bg-[#F4F6F5]';
                  if (revealed && opt.correct) {
                    style = 'border-2 border-[#14564A] bg-[#14564A]/10 text-[#14564A]';
                  } else if (revealed && picked && !opt.correct) {
                    style = 'border-2 border-[#BD3B33] bg-[#BD3B33]/10 text-[#BD3B33]';
                  } else if (revealed && !picked) {
                    style = 'border-2 border-[#E3E8E6] bg-[#F4F6F5] text-[#7E8A86] opacity-60';
                  }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => quiz!.onSelect?.(opt.id)}
                      className={`text-left text-sm font-medium px-3 py-2.5 rounded-[12px] transition-colors disabled:cursor-default ${style}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {opt.card && <PlayingCard suit={opt.card.suit} rank={opt.card.rank} size="sm" />}
                        {isBidPick && opt.bid !== undefined && (
                          <div className="w-9 h-12 rounded-[7px] bg-[#E6B24A] text-[#15110C] flex items-center justify-center font-bold text-sm flex-shrink-0">
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
              <p className="text-[#7E8A86] text-xs">Tap a highlighted card in your hand below.</p>
            )}

            {quiz?.feedback && !answered && (
              <p className="text-[#15110C] text-xs mt-3 pt-3 border-t border-[#E3E8E6] leading-relaxed">{quiz.feedback}</p>
            )}

            {quiz?.verdict && answered && (
              <p className={`text-sm font-semibold mt-3 ${quiz.verdict === 'strong' ? 'text-[#14564A]' : 'text-[#BD3B33]'}`}>
                {quiz.verdict === 'strong' ? 'Strong play.' : 'Not the best line.'}
              </p>
            )}

            {answered && quiz?.onProceed && (
              <button
                type="button"
                onClick={quiz.onProceed}
                className="mt-3 w-full py-2.5 rounded-[12px] bg-[#E6B24A] text-[#15110C] font-bold text-sm hover:bg-[#C49135] transition-colors"
              >
                {quiz.proceedLabel ?? 'Continue'}
              </button>
            )}
          </div>
        )}

        {!hasWorkflow && !compact && !isTyping && text && (
          <div className={`bg-[#FBF7EE] border border-[#E3E8E6] text-[#15110C] rounded-[12px] px-3 py-2 ${textSize}`}>
            {text}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-[12px] transition-colors ${
                  a.variant === 'primary'
                    ? 'bg-[#14564A] text-[#FBF7EE] hover:bg-[#0C3128]'
                    : 'border border-[#14564A] text-[#14564A] hover:bg-[#14564A]/10'
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
