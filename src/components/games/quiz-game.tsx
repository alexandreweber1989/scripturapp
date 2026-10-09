"use client";

import clsx from "clsx";
import { ArrowRight, Check, RotateCcw, Timer, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Difficulty, type QuizAnswer, type QuizPack, type QuizQuestion, pickRound } from "@/domain/games/quiz";
import { useScriptura } from "@/lib/client/store";
import { Button, Card, ProgressBar } from "../ui";

const DIFFICULTIES: { id: Difficulty | "all"; label: string; hint: string }[] = [
  { id: "easy", label: "Fácil", hint: "2 XP por acerto" },
  { id: "medium", label: "Médio", hint: "3 XP por acerto" },
  { id: "hard", label: "Difícil", hint: "5 XP por acerto" },
  { id: "all", label: "Misto", hint: "Um pouco de tudo" },
];

type Phase = { name: "intro" } | { name: "playing" } | { name: "finished"; correct: number; xp: number | null };

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The quiz engine. One component serves every multiple-choice and
 * true/false pack; the score is recomputed by the server from the answers.
 */
export function QuizGame({ pack }: { pack: QuizPack }) {
  const { record } = useScriptura();
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(pack.secondsPerQuestion ?? 0);
  const sessionId = useRef("");

  const question = questions[index];
  const answered = choice !== null;

  const start = (difficulty: Difficulty | "all") => {
    sessionId.current = newSessionId();
    setQuestions(pickRound(pack, sessionId.current, difficulty === "all" ? undefined : difficulty));
    setIndex(0);
    setAnswers([]);
    setChoice(null);
    setSecondsLeft(pack.secondsPerQuestion ?? 0);
    setPhase({ name: "playing" });
  };

  const answer = useCallback(
    (option: number) => {
      if (!question || choice !== null) return;
      setChoice(option);
      setAnswers((a) => [...a, { questionId: question.id, choice: option }]);
    },
    [question, choice],
  );

  // Countdown; running out of time counts as a wrong answer (-1).
  useEffect(() => {
    if (phase.name !== "playing" || !pack.secondsPerQuestion || answered) return;
    const timer = setTimeout(() => (secondsLeft <= 1 ? answer(-1) : setSecondsLeft(secondsLeft - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase.name, pack.secondsPerQuestion, answered, secondsLeft, answer]);

  const next = async () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setChoice(null);
      setSecondsLeft(pack.secondsPerQuestion ?? 0);
      return;
    }
    const correct = answers.filter((a) => questions.find((q) => q.id === a.questionId)?.answer === a.choice).length;
    setPhase({ name: "finished", correct, xp: null });
    const reward = await record({ type: "quiz_completed", packId: pack.id, sessionId: sessionId.current, answers });
    setPhase({ name: "finished", correct, xp: reward?.xp ?? 0 });
  };

  if (phase.name === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{pack.questionsPerRound} perguntas por rodada</p>
          <h1 className="font-display text-3xl font-bold">{pack.title}</h1>
          <p className="mt-2 text-muted">{pack.description}</p>
        </header>
        {pack.variant === "true-false" ? (
          <Button className="w-full py-3 text-base" onClick={() => start("all")}>
            Começar
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => start(d.id)}
                className="rounded-2xl glass border border-line p-4 text-left shadow-card premium-lift"
              >
                <p className="font-display text-lg font-bold">{d.label}</p>
                <p className="text-sm text-muted">{d.hint}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase.name === "finished") {
    const total = questions.length;
    const perfect = phase.correct === total;
    return (
      <Card className="animate-rise mx-auto max-w-md space-y-5 text-center">
        <Trophy className={clsx("mx-auto size-12", perfect ? "text-gold-bright" : "text-muted")} />
        <div>
          <p className="font-display text-3xl font-bold">
            {phase.correct}/{total}
          </p>
          <p className="text-muted">{perfect ? "Gabarito! Você conhece bem a Palavra." : phase.correct >= total / 2 ? "Muito bem! Continue estudando." : "Cada erro é uma chance de aprender."}</p>
        </div>
        <p className="font-semibold text-gold">{phase.xp === null ? "Calculando XP…" : phase.xp > 0 ? `+${phase.xp} XP` : "Sem XP desta vez (limite diário ou nenhum acerto)"}</p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={() => setPhase({ name: "intro" })}>
            <RotateCcw className="size-4" /> Jogar de novo
          </Button>
          <Link href="/jogos" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surface-2">
            Outros jogos
          </Link>
        </div>
      </Card>
    );
  }

  if (!question) return null;
  const isCorrect = choice === question.answer;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Pergunta {index + 1} de {questions.length}
        </span>
        {pack.secondsPerQuestion && (
          <span className={clsx("flex items-center gap-1 font-semibold", secondsLeft <= 3 && !answered && "text-danger")}>
            <Timer className="size-4" /> {answered ? "—" : `${secondsLeft}s`}
          </span>
        )}
      </div>
      <ProgressBar value={(index + (answered ? 1 : 0)) / questions.length} />

      <Card key={question.id} className="animate-rise space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold">{question.category}</p>
        <h2 className="font-display text-2xl font-bold leading-snug">{question.prompt}</h2>
        <div className={clsx("grid gap-2", pack.variant === "true-false" ? "grid-cols-2" : "grid-cols-1")}>
          {question.options.map((option, i) => {
            const state = !answered ? "idle" : i === question.answer ? "right" : i === choice ? "wrong" : "dim";
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={answered}
                className={clsx(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left font-medium transition",
                  state === "idle" && "border-line bg-bg hover:border-primary/60",
                  state === "right" && "border-success bg-success-soft text-success",
                  state === "wrong" && "border-danger bg-danger-soft text-danger",
                  state === "dim" && "border-line opacity-50",
                )}
              >
                {option}
                {state === "right" && <Check className="size-5 shrink-0" />}
                {state === "wrong" && <X className="size-5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="animate-rise space-y-3 rounded-xl bg-surface-2 p-4">
            <p className={clsx("font-semibold", isCorrect ? "text-success" : "text-danger")}>
              {isCorrect ? "Correto!" : choice === -1 ? "O tempo acabou." : "Não foi dessa vez."}
            </p>
            {question.explanation && <p className="text-sm">{question.explanation}</p>}
            {question.reference && <p className="text-sm font-medium text-primary">{question.reference}</p>}
            <Button onClick={next} className="w-full">
              {index + 1 < questions.length ? "Próxima" : "Ver resultado"} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
