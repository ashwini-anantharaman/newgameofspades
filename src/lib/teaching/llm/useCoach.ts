import { useCallback, useRef, useState } from "react";
import type { MoveQuiz, QuizStep } from "../quiz";
import { CoachRequest } from "./protocol";
import { streamCoach } from "./client";
import type { QuizOption } from "../quiz";
import { gentleWorkflowWrongMessage, REVEAL_AFTER_ATTEMPTS } from "../coach";

export interface QuizAnswerResult {
  stepId: string;
  option: QuizOption;
  quizComplete: boolean;
  revealed?: boolean;
}

export interface CoachQuizState {
  stepId: string;
  question: string;
  options: QuizStep["options"];
  answeredId?: string;
  feedback?: string;
  wrongAttempts?: number;
  revealed?: boolean;
  verdict?: "strong" | "weak";
  completed?: boolean;
}

export interface CoachMessage {
  id: string;
  role: "coach" | "user";
  text: string;
  pending?: boolean;
  quiz?: CoachQuizState;
}

const MCQ_STEPS = new Set(["pick-card", "pick-bid"]);

let idSeq = 0;
const nextId = () => `m${++idSeq}`;
const MAX_MESSAGES = 14;

/**
 * useCoach drives the CoachBubble panel.
 * SpadesCoach-style: pick an MCQ option → review feedback → proceed to commit.
 */
export function useCoach(endpoint = "/api/coach") {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [online, setOnline] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const quizRef = useRef<{
    quiz: MoveQuiz;
    stepIndex: number;
    wrongAttempts: number;
    pendingMessageId?: string;
    pendingOption?: QuizOption;
    pendingRevealed?: boolean;
  } | null>(null);

  const push = useCallback((m: CoachMessage) => {
    setMessages((prev) => {
      const next = [...prev, m];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
  }, []);

  const pruneMessages = useCallback((keep = 8) => {
    setMessages((prev) => (prev.length > keep ? prev.slice(-keep) : prev));
  }, []);
  const patch = (id: string, text: string, pending = true) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, pending } : m)));

  const showQuizStep = useCallback((step: QuizStep) => {
    push({
      id: nextId(),
      role: "coach",
      text: step.hint,
      quiz: { stepId: step.id, question: step.question, options: step.options },
    });
  }, [push]);

  const startQuiz = useCallback((quiz: MoveQuiz) => {
    quizRef.current = { quiz, stepIndex: 0, wrongAttempts: 0 };
    setMessages((prev) => (prev.length > 6 ? prev.slice(-6) : prev));
    showQuizStep(quiz.steps[0]);
  }, [showQuizStep]);

  const clearQuiz = useCallback(() => {
    quizRef.current = null;
  }, []);

  const answerQuiz = useCallback((messageId: string, optionId: string): QuizAnswerResult | null => {
    const ctx = quizRef.current;
    if (!ctx) return null;

    const step = ctx.quiz.steps[ctx.stepIndex];
    const opt = step.options.find((o) => o.id === optionId);
    if (!opt) return null;

    const isMcq = MCQ_STEPS.has(step.id);

    if (isMcq && !opt.correct) {
      const attempts = ++ctx.wrongAttempts;

      if (attempts >= REVEAL_AFTER_ATTEMPTS) {
        const correct = step.options.find((o) => o.correct);
        if (!correct) return null;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.quiz
              ? {
                  ...m,
                  quiz: {
                    ...m.quiz,
                    answeredId: correct.id,
                    wrongAttempts: attempts,
                    revealed: true,
                    verdict: "weak",
                  },
                }
              : m,
          ),
        );

        ctx.pendingMessageId = messageId;
        ctx.pendingOption = correct;
        ctx.pendingRevealed = true;

        return { stepId: step.id, option: correct, quizComplete: false, revealed: true };
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  wrongAttempts: attempts,
                  feedback: gentleWorkflowWrongMessage(REVEAL_AFTER_ATTEMPTS - attempts),
                },
              }
            : m,
        ),
      );
      return { stepId: step.id, option: opt, quizComplete: false };
    }

    if (isMcq) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.quiz
            ? {
                ...m,
                quiz: {
                  ...m.quiz,
                  answeredId: optionId,
                  verdict: opt.correct ? "strong" : "weak",
                },
              }
            : m,
        ),
      );
      ctx.pendingMessageId = messageId;
      ctx.pendingOption = opt;
      ctx.pendingRevealed = false;
      return { stepId: step.id, option: opt, quizComplete: false };
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.quiz
          ? { ...m, quiz: { ...m.quiz, answeredId: optionId, feedback: opt.feedback } }
          : m,
      ),
    );

    ctx.stepIndex += 1;
    const hasMore = ctx.stepIndex < ctx.quiz.steps.length;
    if (hasMore) showQuizStep(ctx.quiz.steps[ctx.stepIndex]);
    else quizRef.current = null;

    return { stepId: step.id, option: opt, quizComplete: !hasMore };
  }, [showQuizStep]);

  const proceedQuiz = useCallback((messageId: string): QuizAnswerResult | null => {
    const ctx = quizRef.current;
    if (!ctx || ctx.pendingMessageId !== messageId || !ctx.pendingOption) return null;

    const step = ctx.quiz.steps[ctx.stepIndex];
    const opt = ctx.pendingOption;
    const revealed = ctx.pendingRevealed;
    ctx.pendingMessageId = undefined;
    ctx.pendingOption = undefined;
    ctx.pendingRevealed = undefined;

    ctx.stepIndex += 1;
    const hasMore = ctx.stepIndex < ctx.quiz.steps.length;
    if (hasMore) showQuizStep(ctx.quiz.steps[ctx.stepIndex]);
    else quizRef.current = null;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.quiz ? { ...m, quiz: { ...m.quiz, completed: true } } : m,
      ),
    );

    return { stepId: step.id, option: opt, quizComplete: !hasMore, revealed };
  }, [showQuizStep]);

  const run = useCallback(async (req: CoachRequest, fallback: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = nextId();
    push({ id, role: "coach", text: "", pending: true });

    let acc = "";
    let errored = false;
    const full = await streamCoach(
      req,
      {
        onDelta: (t) => { acc += t; patch(id, acc, true); },
        onDone: () => { if (!errored) setOnline(true); patch(id, acc, false); },
        onError: () => { errored = true; setOnline(false); },
      },
      endpoint,
      ctrl.signal,
    );

    if (!full.trim()) patch(id, fallback, false);
    return full || fallback;
  }, [endpoint, push]);

  const coach = useCallback((req: CoachRequest, fallback: string) => run(req, fallback), [run]);

  const ask = useCallback(async (question: string, base: Omit<CoachRequest, "kind" | "question">) => {
    push({ id: nextId(), role: "user", text: question });
    const fallback = base.evals?.[0]?.rationale ?? "I'm offline right now, but check the highlighted card.";
    return run({ ...base, kind: "ask", question }, fallback);
  }, [push, run]);

  const briefing = useCallback((base: Omit<CoachRequest, "kind">) => {
    const fb = base.weakNodes.length
      ? `This game, let's focus on: ${base.weakNodes.join(", ")}.`
      : "Let's play — I'll point things out as we go.";
    return run({ ...base, kind: "briefing" }, fb);
  }, [run]);

  return { messages, online, coach, ask, briefing, startQuiz, answerQuiz, proceedQuiz, clearQuiz, pruneMessages };
}
