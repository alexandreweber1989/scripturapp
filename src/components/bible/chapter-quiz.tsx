"use client";

import clsx from "clsx";
import { ArrowRight, Check, Route, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { chapterKey } from "@/domain/bible/books";
import { CHAPTER_QUIZ_PASS, type ChapterQuestion } from "@/domain/games/chapter-quiz";
import { getTrail, stepHref, trailProgress } from "@/domain/trails";
import { useScriptura } from "@/lib/client/store";
import { Button } from "../ui";

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Three comprehension questions after reading a chapter; passing advances any trail that includes it. */
export function ChapterQuiz({ bookId, chapter, questions, trailId }: { bookId: string; chapter: number; questions: ChapterQuestion[]; trailId: string | null }) {
  const { record, progress } = useScriptura();
  const [started, setStarted] = useState(false);
  const [choices, setChoices] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const sessionId = useRef("");
  const key = chapterKey(bookId, chapter);
  const best = progress.chapterQuizzes[key] ?? 0;
  const trail = trailId ? getTrail(trailId) : undefined;

  const correct = choices.filter((c, i) => c === questions[i].answer).length;
  const allAnswered = choices.every((c) => c !== null);

  const start = () => {
    sessionId.current = newSessionId();
    setChoices(questions.map(() => null));
    setSubmitted(false);
    setStarted(true);
  };

  const submit = async () => {
    setSubmitted(true);
    await record({
      type: "chapter_quiz_completed",
      book: bookId,
      chapter,
      sessionId: sessionId.current,
      answers: questions.map((q, i) => ({ questionId: q.id, choice: choices[i] ?? -1 })),
    });
  };

  if (!started) {
    return (
      <div className="glass gradient-border w-full space-y-3 rounded-2xl p-5 text-left">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-4" /> Desafio do capítulo
        </p>
        <p className="font-display text-lg font-bold">Você entendeu o que leu? 3 perguntas rápidas.</p>
        <p className="text-sm text-muted">
          {best > 0 ? `Seu melhor resultado: ${best}/3. Melhore para ganhar mais XP.` : "Cada acerto vale XP. Acerte 2 de 3 para avançar nas trilhas."}
        </p>
        <Button onClick={start}>{best > 0 ? "Tentar de novo" : "Responder"}</Button>
      </div>
    );
  }

  const nextTrailStep = (() => {
    if (!trail) return null;
    const p = trailProgress(trail, progress);
    return p.current >= 0 ? trail.steps[p.current] : null;
  })();

  return (
    <div className="w-full space-y-4 text-left">
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="glass space-y-2 rounded-2xl border border-line p-4">
          <legend className="sr-only">Pergunta {qi + 1}</legend>
          <p className="font-semibold">
            <span className="mr-2 font-mono text-primary">{qi + 1}.</span>
            {q.prompt}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((option, oi) => {
              const chosen = choices[qi] === oi;
              const state = !submitted ? (chosen ? "chosen" : "idle") : oi === q.answer ? "right" : chosen ? "wrong" : "dim";
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setChoices((c) => c.map((v, i) => (i === qi ? oi : v)))}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                    state === "idle" && "border-line bg-bg hover:border-primary/60",
                    state === "chosen" && "border-primary bg-primary-soft text-primary",
                    state === "right" && "border-success bg-success-soft text-success",
                    state === "wrong" && "border-danger bg-danger-soft text-danger",
                    state === "dim" && "border-line opacity-50",
                  )}
                >
                  {option}
                  {state === "right" && <Check className="size-4 shrink-0" />}
                  {state === "wrong" && <X className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {submitted && <p className="text-sm text-muted">{q.explanation}</p>}
        </fieldset>
      ))}

      {!submitted ? (
        <Button onClick={submit} disabled={!allAnswered} className="w-full">
          Conferir respostas
        </Button>
      ) : (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl border border-line p-4 text-center">
          <p className="font-display text-2xl font-bold">
            <span className="font-mono">{correct}/3</span> {correct === 3 ? "· Gabarito!" : correct >= CHAPTER_QUIZ_PASS ? "· Etapa vencida" : "· Quase lá"}
          </p>
          {correct < CHAPTER_QUIZ_PASS && <p className="text-sm text-muted">Releia o capítulo e tente de novo: acerte 2 de 3 para avançar.</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={start}>
              Tentar de novo
            </Button>
            {trail && (
              <Link href={`/trilhas/${trail.id}`} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary hover:bg-surface-2">
                <Route className="size-4" /> Ver trilha
              </Link>
            )}
            {trail && nextTrailStep && nextTrailStep !== key && correct >= CHAPTER_QUIZ_PASS && (
              <Link href={stepHref(nextTrailStep, trail.id)} className="bg-gradient-primary glow-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white">
                Próxima etapa <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
