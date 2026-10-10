"use client";

import clsx from "clsx";
import { ArrowRight, Check, Lock, Star, Swords } from "lucide-react";
import Image from "next/image";
import { ViewTransition } from "react";
import Link from "@/components/transition-link";
import { CHAPTER_QUIZ_PASS } from "@/domain/games/chapter-quiz";
import {
  MASTERY_RATIO,
  TRAIL_COMPLETE_BONUS,
  TRAIL_MASTERY_BONUS,
  type Trail,
  isStepPassed,
  stepHref,
  stepLabel,
  trailProgress,
} from "@/domain/trails";
import { relicImage, trailCover } from "@/lib/assets";
import { useScriptura } from "@/lib/client/store";
import { ButtonLink, Skeleton } from "../ui";

/** Shared by the trail card cover and the trail page cover, which morph into each other. */
const coverTransitionName = (trailId: string) => `trail-cover-${trailId}`;

export function Stars({ count, className, size = "size-4", onDark = false }: { count: number; className?: string; size?: string; onDark?: boolean }) {
  return (
    <span className={clsx("inline-flex gap-0.5", className)} role="img" aria-label={`${count} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} className={clsx(size, i < count ? "fill-gold-bright text-gold-bright" : onDark ? "text-white/35" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

function TrailBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("h-2 overflow-hidden rounded-full", className)}>
      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))] transition-[width] duration-500" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

export function TrailCard({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  const { progress, mode } = useScriptura();
  const p = trailProgress(trail, progress);
  return (
    <Link
      href={`/trilhas/${trail.id}`}
      className="glass premium-lift flex h-full flex-col overflow-hidden rounded-2xl border border-line shadow-card"
    >
      {/* Morphs into the trail page's cover (same name there). */}
      <ViewTransition name={coverTransitionName(trail.id)} share="morph" default="none">
        <div className="relative aspect-video">
          <Image src={trailCover(trail.id)} alt="" fill sizes="(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 80vw" className="object-cover" />
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-0.5 tabular-nums text-[11px] text-white backdrop-blur">
            {trail.steps.length} etapas
          </span>
        </div>
      </ViewTransition>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-extrabold leading-tight">{trail.title}</h3>
          {mode !== "loading" && <Stars count={p.stars} className="mt-1 shrink-0" />}
        </div>
        {!compact && <p className="flex-1 text-sm text-muted">{trail.subtitle}</p>}
        <TrailBar value={p.passed / p.total} className="bg-surface-2" />
        <div className="flex justify-between tabular-nums text-xs text-muted">
          <span>{p.mastered ? "Dominada" : p.completed ? "Concluída" : p.passed > 0 ? `Etapa ${p.passed + 1}` : "Começar"}</span>
          <span>
            {p.passed}/{p.total}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Horizontal positions (% of the path width) that make the path wind. */
const WIND = [50, 72, 82, 72, 50, 28, 18, 28];
const ROW = 112;
const TOP = 48;

export function TrailPath({ trail }: { trail: Trail }) {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return <Skeleton className="h-[60vh]" />;
  const p = trailProgress(trail, progress);
  const total = trail.steps.length;

  // Node centers (x in %, y in px), the final challenge last.
  const points = Array.from({ length: total + 1 }, (_, i) => ({ x: i === total ? 50 : WIND[i % WIND.length], y: TOP + i * ROW }));
  const height = points[total].y + 120;
  const d = points
    .map((pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[i - 1];
      const mid = (prev.y + pt.y) / 2;
      return `C ${prev.x} ${mid}, ${pt.x} ${mid}, ${pt.x} ${pt.y}`;
    })
    .join(" ");
  // Colored from the start up to the next node to play.
  const doneUntil = p.passed > 0 ? points[p.passed].y : 0;

  return (
    <div className="space-y-6">
      <ViewTransition name={coverTransitionName(trail.id)} share="morph" default="none">
        <section className="relative isolate flex min-h-72 items-end overflow-hidden rounded-3xl shadow-card">
          <Image src={trailCover(trail.id)} alt="" fill priority sizes="(min-width: 1024px) 60rem, 100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[hsl(232_45%_6%/0.95)] via-[hsl(232_45%_6%/0.55)] to-[hsl(232_45%_6%/0.1)]" />
          <div className="w-full space-y-2 p-6 text-white">
            <p className="tabular-nums text-[11px] uppercase tracking-[0.18em] text-[hsl(230_90%_82%)]">Trilha · {total} etapas</p>
            <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">{trail.title}</h1>
            <p className="max-w-xl text-white/80">{trail.description}</p>
            <div className="flex items-center gap-3 pt-1">
              <Stars count={p.stars} size="size-5" onDark />
              <span className="tabular-nums text-sm">
                {p.passed}/{total} concluídas
              </span>
            </div>
            <TrailBar value={p.passed / total} className="bg-white/20" />
          </div>
        </section>
      </ViewTransition>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ol className="relative mx-auto w-full max-w-sm" style={{ height }} aria-label="Etapas da trilha">
          <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id={`trail-done-${trail.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--primary)" />
              </linearGradient>
              <clipPath id={`trail-clip-${trail.id}`}>
                <rect x="-10" y="0" width="120" height={doneUntil} />
              </clipPath>
            </defs>
            <path d={d} fill="none" stroke="var(--line)" strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" vectorEffect="non-scaling-stroke" />
            <path
              d={d}
              fill="none"
              stroke={`url(#trail-done-${trail.id})`}
              strokeWidth={6}
              strokeLinecap="round"
              clipPath={`url(#trail-clip-${trail.id})`}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {trail.steps.map((key, i) => {
            const passed = isStepPassed(progress, key);
            const current = i === p.current;
            const locked = !passed && !current;
            const best = progress.chapterQuizzes[key] ?? 0;
            const node = (
              <span
                className={clsx(
                  "grid size-16 place-items-center rounded-full border-4 border-bg text-white transition",
                  passed && "bg-gradient-accent shadow-[0_6px_18px_-6px_color-mix(in_srgb,var(--accent)_70%,transparent)]",
                  current && "bg-gradient-primary glow-primary animate-pulse-node ring-[6px] ring-primary-soft",
                  locked && "border-line bg-surface-2 text-muted",
                )}
              >
                {passed ? <Check className="size-7" /> : locked ? <Lock className="size-5" /> : <span className="tabular-nums text-xl font-bold">{i + 1}</span>}
              </span>
            );
            return (
              <li
                key={key}
                className="absolute flex w-36 -translate-x-1/2 -translate-y-8 flex-col items-center gap-1 text-center"
                style={{ left: `${points[i].x}%`, top: points[i].y }}
              >
                {locked ? (
                  <span aria-label={`${stepLabel(key)} (bloqueada)`} className="cursor-not-allowed">
                    {node}
                  </span>
                ) : (
                  <Link
                    href={stepHref(key, trail.id)}
                    aria-label={`${stepLabel(key)}${passed ? " (concluída)" : " (próxima etapa)"}`}
                    className="rounded-full transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  >
                    {node}
                  </Link>
                )}
                <span className={clsx("rounded-md bg-bg px-1.5 text-sm font-bold", locked && "text-muted")}>{stepLabel(key)}</span>
                {passed && <Stars count={best} size="size-3" />}
                {current && (
                  <span className="whitespace-nowrap rounded-full bg-primary-soft px-2 py-0.5 tabular-nums text-[11px] font-bold text-primary">
                    LER + QUIZ
                  </span>
                )}
              </li>
            );
          })}

          <li
            className="absolute flex w-40 -translate-x-1/2 -translate-y-10 flex-col items-center gap-1 text-center"
            style={{ left: "50%", top: points[total].y }}
          >
            {p.completed ? (
              <Link
                href={`/trilhas/${trail.id}/desafio`}
                className={clsx(
                  "grid size-20 place-items-center rounded-3xl text-white shadow-card",
                  p.mastered ? "bg-gradient-accent" : "bg-gradient-gold glow-gold animate-pulse-node",
                )}
                aria-label="Desafio final"
              >
                <Swords className="size-9" />
              </Link>
            ) : (
              <span
                className="relative grid size-20 place-items-center rounded-3xl border-2 border-dashed border-gold-bright bg-gold-soft text-gold"
                aria-label="Desafio final bloqueado"
              >
                <Swords className="size-8" />
                <Lock className="absolute -bottom-1.5 -right-1.5 size-7 rounded-full border border-line bg-bg p-1.5 text-muted" />
              </span>
            )}
            <span className="rounded-md bg-bg px-1.5 font-display font-bold">Desafio final</span>
            <span className="text-xs text-muted">
              {p.completed ? (p.mastered ? "Dominado · jogue de novo quando quiser" : `Acerte ${MASTERY_RATIO * 100}% para dominar`) : `Conclua as ${total} etapas`}
            </span>
          </li>
        </ol>

        <RelicCard trail={trail} />
      </div>
    </div>
  );
}

function RelicCard({ trail }: { trail: Trail }) {
  const { progress } = useScriptura();
  const p = trailProgress(trail, progress);
  const cta = p.mastered
    ? { href: `/trilhas/${trail.id}/desafio`, label: "Jogar o desafio de novo" }
    : p.completed
      ? { href: `/trilhas/${trail.id}/desafio`, label: "Enfrentar o desafio final" }
      : { href: stepHref(trail.steps[p.current], trail.id), label: `${p.passed > 0 ? "Continuar" : "Começar"}: ${stepLabel(trail.steps[p.current])}` };

  return (
    <aside className="glass flex flex-col gap-3 self-start rounded-3xl border border-line p-5 shadow-card lg:sticky lg:top-24">
      <p className="tabular-nums text-[11px] uppercase tracking-[0.18em] text-gold">Relíquia da trilha</p>
      <div className="relative mx-auto aspect-square w-full max-w-56 overflow-hidden rounded-2xl bg-[radial-gradient(circle,var(--gold-soft),transparent_70%)]">
        <Image
          src={relicImage(trail.id)}
          alt={trail.relic}
          fill
          sizes="14rem"
          className={clsx("object-cover transition duration-700", !p.mastered && "blur-[1px] brightness-75 grayscale")}
        />
        {!p.mastered && (
          <span className="absolute inset-0 m-auto grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
            <Lock className="size-4" aria-label="Bloqueada" />
          </span>
        )}
      </div>
      <h2 className="text-center font-display text-xl font-extrabold tracking-tight">{trail.relic}</h2>
      <p className="text-center text-sm text-muted">
        {p.mastered
          ? "Conquistada! Ela está guardada na sua coleção, no perfil."
          : `Vença o desafio final com ${MASTERY_RATIO * 100}% de acertos para guardar esta relíquia no seu perfil.`}
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between rounded-xl bg-surface-2 px-3 py-2">
          <span>Concluir a trilha {p.completed && <Check className="inline size-4 text-success" aria-label="feito" />}</span>
          <strong className="tabular-nums text-gold">+{TRAIL_COMPLETE_BONUS} XP</strong>
        </li>
        <li className="flex justify-between rounded-xl bg-surface-2 px-3 py-2">
          <span>Dominar no desafio {p.mastered && <Check className="inline size-4 text-success" aria-label="feito" />}</span>
          <strong className="tabular-nums text-gold">+{TRAIL_MASTERY_BONUS} XP</strong>
        </li>
      </ul>
      <p className="text-center text-xs text-muted">Cada etapa: ler o capítulo e acertar {CHAPTER_QUIZ_PASS} de 3 perguntas.</p>
      <ButtonLink href={cta.href} className="min-h-12 w-full">
        {cta.label} <ArrowRight className="size-4" />
      </ButtonLink>
    </aside>
  );
}

/** Guards the final challenge until every step is passed. */
export function BossGate({ trail, children }: { trail: Trail; children: React.ReactNode }) {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return <Skeleton className="h-96" />;
  if (!trailProgress(trail, progress).completed) {
    return (
      <div className="glass mx-auto max-w-md space-y-3 rounded-2xl border border-line p-5 text-center shadow-card">
        <Lock className="mx-auto size-8 text-muted" />
        <h1 className="font-display text-2xl font-bold">Desafio bloqueado</h1>
        <p className="text-muted">Conclua todas as etapas da trilha {trail.title} para enfrentar o desafio final.</p>
        <Link href={`/trilhas/${trail.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary">
          Voltar à trilha
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
