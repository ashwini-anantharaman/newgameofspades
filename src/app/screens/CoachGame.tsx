import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { CoachBubble } from '../components/CoachBubble';
import { CoachSpotlight } from '../components/CoachSpotlight';
import { BiddingModal } from '../components/BiddingModal';
import { RoundResultsModal } from '../components/RoundResultsModal';
import { newGame, applyAction } from '@/lib/engine/gameState';
import { animateAdvance } from '@/lib/engine/animateAdvance';
import { legalMoves, isLegal } from '@/lib/engine/rules';
import { evaluateMoves } from '@/lib/engine/evaluate';
import type { Card, GameState, Seat, Team } from '@/lib/engine/types';
import { sameCard } from '@/lib/engine/types';
import { analyzeMove, PLAY_MODE_META, usesCoachQuiz, type MoveAnalysis } from '@/lib/teaching/coach';
import { buildMoveQuiz, buildBidQuiz } from '@/lib/teaching/quiz';
import { weaknesses } from '@/lib/teaching/profile';
import { useCoachApiStatus } from '@/lib/teaching/content/useCoachApiStatus';
import { useCoach } from '@/lib/teaching/llm/useCoach';
import type { CoachRequest } from '@/lib/teaching/llm/protocol';
import { nodeById } from '@/lib/teaching/skillTree';
import { useSpadesStore } from '@/lib/store/SpadesProvider';

interface CoachGameProps {
  onNavigate: (screen: string) => void;
}

function teamBid(state: GameState, team: Team): number {
  const seats: Seat[] = team === 'NS' ? ['N', 'S'] : ['E', 'W'];
  return seats.reduce((sum, s) => {
    const b = state.bids[s];
    return sum + (b === null || b === 'nil' ? 0 : b);
  }, 0);
}

function teamTricks(state: GameState, team: Team): number {
  const seats: Seat[] = team === 'NS' ? ['N', 'S'] : ['E', 'W'];
  return seats.reduce((sum, s) => sum + state.tricksWon[s], 0);
}

function scoreLine(state: GameState): string {
  const tricks = state.tricksWon.S;
  const bid = state.bids.S === 'nil' ? 0 : (state.bids.S ?? 0);
  const need = Math.max(0, bid - tricks);
  return `You: ${tricks} trick(s), bid ${state.bids.S ?? '?'}${need ? ` (need ${need} more)` : ''}, team bags ${state.bags.NS}`;
}

export function CoachGame({ onNavigate }: CoachGameProps) {
  const { profile, settings, observe, completeGame, setLastGame, setPlayMode } = useSpadesStore();
  const weakNodes = useMemo(() => weaknesses(profile, 4), [profile]);
  const weakTitles = useMemo(() => weakNodes.map((id) => nodeById(id)?.title ?? id), [weakNodes]);

  const { messages, online: coachStreamOnline, coach, ask, briefing, startQuiz, answerQuiz, proceedQuiz, clearQuiz, pruneMessages } = useCoach();
  const apiOnline = useCoachApiStatus();
  const online = apiOnline !== false && coachStreamOnline;
  const [game, setGame] = useState<GameState>(() => newGame());
  const [tableBusy, setTableBusy] = useState(true);
  const [actorLabel, setActorLabel] = useState<string | null>(null);
  const animTokenRef = useRef(0);
  const mountedRef = useRef(false);
  const [inputText, setInputText] = useState('');
  const [showBidding, setShowBidding] = useState(() => game.phase === 'bidding' && game.turn === 'S');
  const [showResults, setShowResults] = useState(false);
  const [coachOpen] = useState(true);
  const promptedRef = useRef(false);
  const briefedRef = useRef(false);
  const quizTurnRef = useRef<string | null>(null);
  const bidRoundRef = useRef<number | null>(null);
  const moveWrongAttemptsRef = useRef(0);
  const [playStats, setPlayStats] = useState({ good: 0, total: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [pendingUndo, setPendingUndo] = useState<{
    before: GameState;
    afterSouth: GameState;
    card: Card;
    analysis: MoveAnalysis;
    prompted: boolean;
    wrongAttempt: number;
  } | null>(null);

  const playAiSequence = useCallback(
    async (start: GameState): Promise<GameState> => {
      const token = ++animTokenRef.current;
      setTableBusy(true);
      const final = await animateAdvance(start, 'S', (state, label) => {
        if (animTokenRef.current !== token) return;
        setGame(state);
        setActorLabel(label);
        if (state.phase === 'bidding' && state.turn === 'S' && settings.playMode === 'Solo') setShowBidding(true);
      });
      if (animTokenRef.current === token) {
        setActorLabel(null);
        setTableBusy(false);
        setLastGame(final);
      }
      return final;
    },
    [setLastGame, settings.playMode],
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    void playAiSequence(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only the initial deal/bid sequence once
  }, []);

  const turnKey = useMemo(() => {
    if (game.phase !== 'playing' || game.turn !== 'S') return null;
    return `${game.roundNumber}-${game.trick.length}-${game.hands.S.length}`;
  }, [game]);

  const yourHand = game.hands.S;
  const legal = useMemo(() => legalMoves(game, 'S'), [game]);

  useEffect(() => {
    if (!briefedRef.current) {
      briefedRef.current = true;
      const base = coachRequestBase(game, weakTitles, []);
      briefing({ ...base, weakNodes: weakTitles });
    }
  }, [briefing, game, weakTitles]);

  useEffect(() => {
    if (game.phase === 'bidding' && game.turn === 'S' && !tableBusy && usesCoachQuiz(settings.playMode)) {
      setShowBidding(false);
      if (bidRoundRef.current === game.roundNumber) return;
      bidRoundRef.current = game.roundNumber;
      const quiz = buildBidQuiz(game, 'S', settings.playMode);
      if (quiz) startQuiz(quiz);
    }
  }, [game, startQuiz, settings.playMode, tableBusy]);

  useEffect(() => {
    if (game.phase === 'bidding' && game.turn === 'S' && !tableBusy && settings.playMode === 'Solo') {
      setShowBidding(true);
    }
  }, [game.phase, game.turn, tableBusy, settings.playMode]);

  useEffect(() => {
    moveWrongAttemptsRef.current = 0;
  }, [turnKey]);

  useEffect(() => {
    if (!turnKey || !usesCoachQuiz(settings.playMode) || pendingUndo) {
      if (!turnKey || settings.playMode === 'Solo') clearQuiz();
      return;
    }
    if (quizTurnRef.current === turnKey) return;

    const quiz = buildMoveQuiz(game, 'S', settings.playMode);
    if (!quiz) return;

    quizTurnRef.current = turnKey;
    startQuiz(quiz);
  }, [turnKey, game, settings.playMode, startQuiz, clearQuiz, pendingUndo]);

  const activeQuizMessage = useMemo(
    () =>
      [...messages].reverse().find(
        (m) =>
          m.quiz &&
          !m.quiz.completed &&
          (m.quiz.stepId === 'pick-card' || m.quiz.stepId === 'pick-bid'),
      ),
    [messages],
  );

  const mcqQuiz = activeQuizMessage?.quiz?.stepId === 'pick-card' || activeQuizMessage?.quiz?.stepId === 'pick-bid';
  const quizBlocking = usesCoachQuiz(settings.playMode) && Boolean(mcqQuiz) && !pendingUndo;
  const canPlayHand =
    game.phase === 'playing' &&
    game.turn === 'S' &&
    !pendingUndo &&
    !tableBusy &&
    !quizBlocking;

  const spotlightMessage = useMemo(() => {
    if (pendingUndo) return null;
    if (activeQuizMessage) return activeQuizMessage;
    const pending = [...messages].reverse().find((m) => m.role === 'coach' && m.pending);
    if (pending) return pending;
    return [...messages].reverse().find((m) => m.role === 'coach' && !m.quiz) ?? null;
  }, [messages, activeQuizMessage, pendingUndo]);

  const historyMessages = useMemo(() => {
    const spotlightId = spotlightMessage?.id;
    return messages.filter((m) => m.id !== spotlightId);
  }, [messages, spotlightMessage]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [spotlightMessage?.id, turnKey, pendingUndo]);

  const recentLines = useCallback(
    () => messages.slice(-4).map((m) => `${m.role}: ${m.text}`),
    [messages],
  );

  const finalizePlay = useCallback(
    async (before: GameState, afterSouth: GameState, analysis: MoveAnalysis, prompted: boolean) => {
      observe(analysis.observation);
      setGame(afterSouth);
      const next = await playAiSequence(afterSouth);
      setPendingUndo(null);
      quizTurnRef.current = null;

      pruneMessages(6);
      if (!(prompted && analysis.correct)) {
        const reveal = analysis.correct || analysis.askWhy;
        coach(
          {
            ...coachRequestBase(before, weakTitles, recentLines()),
            kind: 'coach',
            mode: analysis.askWhy ? 'reflect' : 'teachable',
            verdict: reveal
              ? {
                  chosen: analysis.chosen.card,
                  best: analysis.best.card,
                  correct: analysis.correct,
                  chosenRationale: analysis.chosen.rationale,
                  bestRationale: analysis.best.rationale,
                }
              : undefined,
          },
          analysis.message,
        );
      }

      if (next.phase === 'scoring' || next.phase === 'gameOver') {
        setShowResults(true);
      }
    },
    [coach, observe, playAiSequence, pruneMessages, recentLines, weakTitles],
  );

  const commitPlay = useCallback(
    (card: Card, prompted: boolean) => {
      if (game.phase !== 'playing' || game.turn !== 'S' || pendingUndo || tableBusy) return;
      if (!isLegal(game, 'S', card)) return;

      const before = game;
      const wrongAttempt = moveWrongAttemptsRef.current + 1;
      const analysis = analyzeMove(before, 'S', card, prompted, wrongAttempt);
      const afterSouth = applyAction(before, { type: 'PLAY', seat: 'S', card });

      if (!analysis.correct) {
        moveWrongAttemptsRef.current = wrongAttempt;
        setPendingUndo({ before, afterSouth, card, analysis, prompted, wrongAttempt });
        setGame(afterSouth);
        setLastGame(afterSouth);
        return;
      }

      finalizePlay(before, afterSouth, analysis, prompted);
    },
    [finalizePlay, game, pendingUndo, setLastGame, tableBusy],
  );

  const handleUndo = useCallback(() => {
    if (!pendingUndo) return;
    setGame(pendingUndo.before);
    setLastGame(pendingUndo.before);
    setPendingUndo(null);
    quizTurnRef.current = null;
    promptedRef.current = false;
  }, [pendingUndo, setLastGame]);

  const handleKeepPlay = useCallback(() => {
    if (!pendingUndo) return;
    const { before, afterSouth, analysis, prompted } = pendingUndo;
    finalizePlay(before, afterSouth, analysis, prompted);
  }, [finalizePlay, pendingUndo]);

  const handleBidCommit = useCallback(async (bid: number, nil: boolean) => {
    if (tableBusy) return;
    const afterBid = applyAction(game, { type: 'BID', seat: 'S', bid: nil ? 'nil' : bid });
    setGame(afterBid);
    setShowBidding(false);
    bidRoundRef.current = null;
    const next = await playAiSequence(afterBid);
    const fallback = nil
      ? 'Bold nil bid! Your partner will try to cover you.'
      : `You bid ${bid}. Team contract is ${teamBid(next, 'NS')} tricks. Let's play!`;
    coach(
      {
        ...coachRequestBase(game, weakTitles, recentLines()),
        kind: 'coach',
        mode: 'bid',
      },
      fallback,
    );
  }, [coach, game, playAiSequence, recentLines, tableBusy, weakTitles]);

  const handleQuizAnswer = useCallback(
    (messageId: string, optionId: string) => {
      answerQuiz(messageId, optionId);
    },
    [answerQuiz],
  );

  const handleQuizProceed = useCallback(
    (messageId: string) => {
      const result = proceedQuiz(messageId);
      if (!result) return;

      if (result.stepId === 'pick-card' && result.option.card) {
        if (result.option.correct && !result.revealed) {
          setPlayStats((s) => ({ good: s.good + 1, total: s.total + 1 }));
        } else if (!result.revealed) {
          setPlayStats((s) => ({ ...s, total: s.total + 1 }));
        }
        promptedRef.current = result.option.correct && !result.revealed;
        commitPlay(result.option.card, promptedRef.current);
        promptedRef.current = false;
      } else if (result.stepId === 'pick-bid' && result.option.bid !== undefined) {
        const nil = result.option.bid === 0;
        void handleBidCommit(nil ? 0 : result.option.bid, nil);
      }
    },
    [commitPlay, handleBidCommit, proceedQuiz],
  );

  const quizPropsFor = useCallback(
    (msg: (typeof messages)[0]) => {
      if (!msg.quiz) return undefined;
      const q = msg.quiz;
      const isBid = q.stepId === 'pick-bid';
      const isCard = q.stepId === 'pick-card';
      return {
        stepId: q.stepId,
        question: q.question,
        options: q.options,
        answeredId: q.answeredId,
        feedback: q.feedback,
        verdict: q.verdict,
        onSelect: (id: string) => handleQuizAnswer(msg.id, id),
        onProceed: q.answeredId ? () => handleQuizProceed(msg.id) : undefined,
        proceedLabel: isBid ? 'Lock in this bid' : isCard ? 'Play this card' : undefined,
      };
    },
    [handleQuizAnswer, handleQuizProceed],
  );

  const handlePlay = (card: Card) => {
    const prompted = promptedRef.current;
    promptedRef.current = false;
    commitPlay(card, prompted);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const q = inputText.trim();
    setInputText('');
    ask(q, coachRequestBase(game, weakTitles, recentLines()));
  };

  const trickNum = game.phase === 'playing' ? 14 - yourHand.length : 0;

  const seatMeta = (seat: Seat, label: string) => {
    const bid = game.bids[seat];
    const bidStr = bid === 'nil' ? 'nil' : bid ?? '—';
    return { label, bid: bidStr, won: game.tricksWon[seat], card: game.trick.find((t) => t.seat === seat)?.card };
  };

  const north = seatMeta('N', 'North');
  const west = seatMeta('W', 'West');
  const east = seatMeta('E', 'East');
  const south = seatMeta('S', 'South (you)');

  return (
    <div
      className="flex flex-col h-[calc(100vh-64px)] min-h-0 pb-20 lg:pb-0 relative overflow-hidden bg-[#F4F6F5]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E3E8E6] bg-[#FBF7EE] flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <div className="text-[#E6B24A] text-[11px] font-bold tracking-[0.2em] uppercase">Spades · Learn by playing</div>
          <div className="text-[#7E8A86] text-xs mt-1">
            {PLAY_MODE_META[settings.playMode].title}
            {' · '}
            {game.phase === 'playing'
              ? `Trick ${trickNum} of 13 · ${game.spadesBroken ? 'spades broken' : 'spades not broken'}`
              : game.phase === 'bidding'
                ? 'Bidding round'
                : 'Round over'}
          </div>
        </div>
        <div className="text-right text-xs text-[#7E8A86] space-y-0.5">
          <div>You + North: <span className="text-[#15110C] font-semibold">{game.scores.NS}</span></div>
          <div>Opponents: <span className="text-[#15110C] font-semibold">{game.scores.EW}</span></div>
          {playStats.total > 0 && (
            <div className="text-[10px] text-[#7E8A86]">Smart plays {playStats.good}/{playStats.total}</div>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* Unified coach + MCQ */}
          {pendingUndo ? (
            <CoachSpotlight
              text={pendingUndo.analysis.message}
              actions={[
                { label: 'Take back', onClick: handleUndo, variant: 'secondary' },
                { label: 'Keep play', onClick: handleKeepPlay, variant: 'primary' },
              ]}
            />
          ) : spotlightMessage ? (
            <CoachSpotlight
              text={spotlightMessage.text || (spotlightMessage.pending ? '…' : '')}
              pending={spotlightMessage.pending}
              quiz={spotlightMessage.quiz ? quizPropsFor(spotlightMessage) : undefined}
            />
          ) : game.phase === 'playing' && game.turn === 'S' && !tableBusy && settings.playMode === 'Solo' ? (
            <CoachSpotlight text="Your turn — tap a highlighted card." />
          ) : null}

          {/* Table */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-[280px]">
            <div className="w-full max-w-md bg-[#14564A] rounded-[28px] p-5 shadow-xl relative">
              {actorLabel && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-[28px]">
                  <span className="text-[#FBF7EE] text-sm font-semibold px-4 text-center animate-pulse">{actorLabel}</span>
                </div>
              )}

              {/* North */}
              <div className="flex flex-col items-center mb-3">
                {north.card ? (
                  <PlayingCard suit={north.card.suit} rank={north.card.rank} size="sm" />
                ) : (
                  <div className="h-14" />
                )}
                <div className="text-[#FBF7EE]/70 text-[10px] mt-1">{north.label} · bid {north.bid}</div>
                <div className="text-[#FBF7EE]/40 text-[9px]">won {north.won}</div>
              </div>

              {/* West · center · East */}
              <div className="flex items-center justify-between gap-2 min-h-[100px]">
                <div className="flex flex-col items-center w-16">
                  {west.card ? (
                    <PlayingCard suit={west.card.suit} rank={west.card.rank} size="sm" />
                  ) : (
                    <div className="h-14" />
                  )}
                  <div className="text-[#FBF7EE]/70 text-[9px] mt-1 text-center">{west.label}</div>
                  <div className="text-[#FBF7EE]/40 text-[8px]">bid {west.bid} · won {west.won}</div>
                </div>

                <div className="flex-1 flex items-center justify-center min-h-[72px]">
                  {game.trick.length === 0 && game.turn === 'S' && !tableBusy ? (
                    <span className="text-[#FBF7EE]/50 text-xs text-center px-2">your turn — tap a card</span>
                  ) : game.trick.length === 0 ? (
                    <span className="text-[#FBF7EE]/30 text-[10px]">trick</span>
                  ) : null}
                </div>

                <div className="flex flex-col items-center w-16">
                  {east.card ? (
                    <PlayingCard suit={east.card.suit} rank={east.card.rank} size="sm" />
                  ) : (
                    <div className="h-14" />
                  )}
                  <div className="text-[#FBF7EE]/70 text-[9px] mt-1 text-center">{east.label}</div>
                  <div className="text-[#FBF7EE]/40 text-[8px]">bid {east.bid} · won {east.won}</div>
                </div>
              </div>

              {/* South */}
              <div className="flex flex-col items-center mt-3">
                {south.card && (
                  <div className="mb-1">
                    <PlayingCard suit={south.card.suit} rank={south.card.rank} size="sm" />
                  </div>
                )}
                <div className="text-[#E6B24A] text-[10px] font-semibold">{south.label} · bid {south.bid}</div>
                <div className="text-[#FBF7EE]/40 text-[9px]">won {south.won}</div>
              </div>
            </div>
          </div>

          {/* Hand */}
          <div className="px-4 pb-4 flex-shrink-0">
            <div className="text-[#7E8A86] text-[10px] uppercase tracking-widest mb-2 text-center">your hand</div>
            <div className="flex gap-2 flex-wrap justify-center max-w-lg mx-auto">
              {yourHand.map((c, i) => {
                const isLegalCard = legal.some((m) => sameCard(m, c));
                const canPlay = canPlayHand && isLegalCard;
                let cardState: 'default' | 'legal' | 'illegal' | 'winner' = 'default';
                if (game.phase === 'playing' && game.turn === 'S') {
                  if (canPlay) cardState = 'legal';
                  else if (!isLegalCard) cardState = 'illegal';
                }
                return (
                  <PlayingCard
                    key={i}
                    suit={c.suit}
                    rank={c.rank}
                    size="lg"
                    state={cardState}
                    onClick={canPlay ? () => handlePlay(c) : undefined}
                  />
                );
              })}
            </div>
            {game.phase === 'bidding' && game.turn === 'S' && !tableBusy && (
              <div className="flex justify-center mt-4">
                <button onClick={() => setShowBidding(true)} className="bg-[#E6B24A] hover:bg-[#C49135] text-[#15110C] font-bold px-6 py-2.5 rounded-[999px] text-sm transition-colors shadow-lg">
                  Place your bid →
                </button>
              </div>
            )}
            {(game.phase === 'scoring' || game.phase === 'gameOver') && (
              <div className="flex justify-center mt-4">
                <button onClick={() => setShowResults(true)} className="bg-[#14564A] text-[#FBF7EE] px-5 py-2 rounded-[999px] text-xs hover:bg-[#0C3128]">
                  View round results
                </button>
              </div>
            )}
          </div>
        </div>

        {coachOpen && (
          <div className="flex flex-col w-full lg:w-72 h-44 lg:h-full min-h-0 max-h-44 lg:max-h-none bg-[#FBF7EE] border-t lg:border-t-0 lg:border-l border-[#E3E8E6] flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3E8E6]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#E6B24A] flex items-center justify-center"><span className="text-xs">♠</span></div>
                <div>
                  <div className="text-xs font-semibold text-[#15110C]">Coach</div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-[#7E8A86]'}`} />
                    <span className="text-[9px] text-[#7E8A86]">{online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['Guided', 'Hard', 'Solo'] as const).map((m) => (
                  <button key={m} onClick={() => setPlayMode(m)} title={PLAY_MODE_META[m].blurb} className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${settings.playMode === m ? 'bg-[#14564A] text-[#FBF7EE]' : 'text-[#7E8A86] hover:bg-[#F4F6F5]'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
              {pendingUndo ? (
                <CoachBubble
                  text={pendingUndo.analysis.message}
                  actions={[
                    { label: 'Take back', onClick: handleUndo, variant: 'secondary' },
                    { label: 'Keep play', onClick: handleKeepPlay, variant: 'primary' },
                  ]}
                />
              ) : spotlightMessage ? (
                <CoachBubble
                  text={spotlightMessage.text || ''}
                  isTyping={spotlightMessage.pending}
                  quiz={spotlightMessage.quiz ? quizPropsFor(spotlightMessage) : undefined}
                />
              ) : game.phase === 'playing' && game.turn === 'S' && !tableBusy && settings.playMode === 'Solo' ? (
                <CoachBubble text="Solo mode — play vs AI with no quizzes. Tap a highlighted card." />
              ) : null}

              {historyMessages.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E3E8E6]">
                  {historyMessages.map((m) => (
                    <CoachBubble
                      key={m.id}
                      text={m.text || (m.pending ? '…' : '')}
                      isUser={m.role === 'user'}
                      isTyping={m.pending}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#E3E8E6]">
              <div className="flex gap-2">
                <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask the coach…" className="flex-1 bg-[#F4F6F5] border border-[#E3E8E6] rounded-[999px] px-3 py-2 text-sm outline-none focus:border-[#14564A] text-[#15110C] placeholder:text-[#7E8A86]" />
                <button onClick={sendMessage} className="w-8 h-8 rounded-full bg-[#14564A] flex items-center justify-center text-[#FBF7EE] hover:bg-[#0C3128] transition-colors">↑</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showBidding && (
        <BiddingModal game={game} onCommit={handleBidCommit} onClose={() => setShowBidding(false)} observe={observe} />
      )}

      {showResults && (
        <RoundResultsModal
          game={game}
          onNext={() => {
            setShowResults(false);
            completeGame(game, `Game ${profile.snapshots.length + 1}`);
            onNavigate('report');
          }}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}

function coachRequestBase(
  state: GameState,
  weakNodes: string[],
  recent: string[],
): Omit<CoachRequest, 'kind' | 'question' | 'mode' | 'verdict'> {
  return {
    phase: state.phase,
    hand: state.hands.S,
    trick: state.trick,
    ledSuit: state.ledSuit,
    bids: state.bids,
    scoreLine: scoreLine(state),
    evals: state.phase === 'playing' ? evaluateMoves(state, 'S') : [],
    weakNodes,
    recent,
  };
}
