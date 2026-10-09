"use client";

import clsx from "clsx";
import { Check, Gem, Lock, Star, Swords } from "lucide-react";
import Link from "next/link";
import { type Trail, type TrailTone, isStepPassed, stepHref, stepLabel, trailProgress } from "@/domain/trails";
import { useScriptura } from "@/lib/client/store";
import { Card, ProgressBar, Skeleton } from "../ui";

const TONE_BG: Record<TrailTone, string> = {
  primary: "bg-gradient-primary",
  gold: "bg-gradient-gold",
  accent: "bg-gradient-accent",
};

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={clsx("inline-flex gap-0.5", className)} aria-label={`${count} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} className={clsx("size-4", i < count ? "fill-gold-bright text-gold-bright" : "text-line")} />
      ))}
    </span>
  );
}

export function TrailCard({ trail }: { trail: Trail }) {
  const { progress, mode } = useScriptura();
  const p = trailProgress(trail, progress);
  return (
    <Link href={`/trilhas/${trail.id}`} className="sheen glass premium-lift flex h-full flex-col gap-4 rounded-2xl border border-line p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className={clsx("grid size-12 place-items-center rounded-xl text-white shadow-card", TONE_BG[trail.tone])}>
          <span className="font-mono text-sm font-bold">{trail.steps.length}</span>
        </span>
        {mode !== "loading" && <Stars count={p.stars} />}
      </div>
      <div className="flex-1">
        <h3 className="font-display text-xl font-bold">{trail.title}</h3>
        <p className="text-sm text-muted">{trail.subtitle}</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between font-mono text-xs text-muted">
          <span>{p.mastered ? "Dominada" : p.completed ? "Concluída" : `Etapa ${Math.min(p.passed + 1, p.total)}`}</span>
          <span>
            {p.passed}/{p.total}
          </span>
        </div>
        <ProgressBar value={p.passed / p.total} tone={trail.tone === "gold" ? "gold" : trail.tone === "accent" ? "success" : "primary"} />
      </div>
    </Link>
  );
}

/** Horizontal offsets that make the path wind, Duolingo style. */
const WIND = [0, 56, 84, 56, 0, -56, -84, -56];

export function TrailPath({ trail }: { trail: Trail }) {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return <Skeleton className="h-[60vh]" />;
  const p = trailProgress(trail, progress);

  return (
    <div className="space-y-8">
      <Card className="gradient-border space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Trilha · {trail.steps.length} etapas</p>
            <h1 className="font-display text-3xl font-extrabold">{trail.title}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{trail.description}</p>
          </div>
          <Stars count={p.stars} />
        </div>
        <ProgressBar value={p.passed / p.total} className="h-2.5" />
        <p className="flex items-center gap-2 text-sm text-muted">
          <Gem className={clsx("size-4", p.mastered ? "text-gold-bright" : "")} />
          {p.mastered ? (
            <span>
              Relíquia conquistada: <strong className="text-ink">{trail.relic}</strong>
            </span>
          ) : (
            <span>
              Vença o desafio final para ganhar a relíquia <strong className="text-ink">{trail.relic}</strong>.
            </span>
          )}
        </p>
      </Card>

      <ol className="relative mx-auto flex max-w-sm flex-col items-center gap-6 py-4">
        {trail.steps.map((key, i) => {
          const passed = isStepPassed(progress, key);
          const current = i === p.current;
          const locked = !passed && !current;
          const best = progress.chapterQuizzes[key] ?? 0;
          const node = (
            <span
              className={clsx(
                "grid size-16 place-items-center rounded-full border-4 text-white transition",
                passed && "bg-gradient-accent border-accent-soft",
                current && "bg-gradient-primary glow-primary border-primary-soft animate-float",
                locked && "border-line bg-surface-2 text-muted",
              )}
            >
              {passed ? <Check className="size-7" /> : locked ? <Lock className="size-5" /> : <span className="font-mono text-lg font-bold">{i + 1}</span>}
            </span>
          );
          return (
            <li key={key} className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(${WIND[i % WIND.length]}px)` }}>
              {locked ? (
                <span aria-disabled className="cursor-not-allowed">
                  {node}
                </span>
              ) : (
                <Link href={stepHref(key, trail.id)} aria-label={`${stepLabel(key)}${passed ? " (concluída)" : ""}`}>
                  {node}
                </Link>
              )}
              <span className={clsx("text-center text-sm font-semibold", locked && "text-muted")}>{stepLabel(key)}</span>
              {passed && <Stars count={best} className="scale-75" />}
              {current && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] text-primary">LER + QUIZ</span>}
            </li>
          );
        })}

        <li className="flex flex-col items-center gap-1.5 pt-2">
          {p.completed ? (
            <Link
              href={`/trilhas/${trail.id}/desafio`}
              className={clsx("grid size-20 place-items-center rounded-3xl text-white shadow-card", p.mastered ? "bg-gradient-accent" : "bg-gradient-gold glow-primary animate-float")}
              aria-label="Desafio final"
            >
              <Swords className="size-9" />
            </Link>
          ) : (
            <span className="grid size-20 place-items-center rounded-3xl border-4 border-line bg-surface-2 text-muted" aria-label="Desafio final bloqueado">
              <Lock className="size-6" />
            </span>
          )}
          <span className="font-display font-bold">Desafio final</span>
          <span className="text-xs text-muted">{p.completed ? (p.mastered ? "Dominado · jogue de novo quando quiser" : "Acerte 70% para dominar a trilha") : "Conclua todas as etapas"}</span>
        </li>
      </ol>
    </div>
  );
}

/** Guards the final challenge until every step is passed. */
export function BossGate({ trail, children }: { trail: Trail; children: React.ReactNode }) {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return <Skeleton className="h-96" />;
  if (!trailProgress(trail, progress).completed) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <Lock className="mx-auto size-8 text-muted" />
        <h1 className="font-display text-2xl font-bold">Desafio bloqueado</h1>
        <p className="text-muted">Conclua todas as etapas da trilha {trail.title} para enfrentar o desafio final.</p>
        <Link href={`/trilhas/${trail.id}`} className="font-semibold text-primary">
          Voltar à trilha
        </Link>
      </Card>
    );
  }
  return <>{children}</>;
}
