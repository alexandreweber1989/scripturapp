"use client";

import clsx from "clsx";
import { ArrowRight, BookOpen, Brain, Check, Flame, Puzzle, Route, Shield, Sparkles, UserPlus } from "lucide-react";
import Link from "@/components/transition-link";
import { useSyncExternalStore } from "react";
import dailyVerses from "@/content/daily-verses.json";
import { getCompanion } from "@/domain/companions";
import { CHAPTER_QUIZ_PERFECT_BONUS, CHAPTER_QUIZ_XP_PER_CORRECT } from "@/domain/games/chapter-quiz";
import { CHAPTER_XP, REVIEW_XP } from "@/domain/progression/activities";
import { levelProgress } from "@/domain/progression/levels";
import { FULL_DAY_BONUS, questStatuses } from "@/domain/progression/quests";
import { MAX_SHIELDS, effectiveStreak, streakAtRisk } from "@/domain/progression/streak";
import { isDue } from "@/domain/memory/srs";
import { daysBetween, dayKey, dayOfYear } from "@/domain/time";
import { TRAILS, stepHref, stepLabel, trailProgress } from "@/domain/trails";
import { useScriptura } from "@/lib/client/store";
import { ContinueReading } from "../bible/reading-progress";
import { CompanionAvatar } from "../companion-avatar";
import { TrailCard } from "../trails/trail-views";
import { Button, ButtonLink, SectionTitle, Skeleton } from "../ui";

/** Most XP a trail step pays: reading plus a perfect chapter quiz. */
const STEP_XP = CHAPTER_XP + 3 * CHAPTER_QUIZ_XP_PER_CORRECT + CHAPTER_QUIZ_PERFECT_BONUS;
const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

function greeting(hour: number) {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function subscribeClock(callback: () => void) {
  const timer = setInterval(callback, 60_000);
  return () => clearInterval(timer);
}

function clockSnapshot() {
  const now = new Date();
  return `${dayKey(now)}|${now.getHours()}`;
}

/** The visitor's day and hour. `null` during prerender, so server and client markup agree. */
function useToday(): { day: string; hour: number } | null {
  const snapshot = useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
  if (!snapshot) return null;
  const [day, hour] = snapshot.split("|");
  return { day, hour: Number(hour) };
}

const asDate = (day: string) => new Date(`${day}T12:00:00Z`);

function shiftDay(day: string, by: number): string {
  return new Date(asDate(day).getTime() + by * 86_400_000).toISOString().slice(0, 10);
}

function longDate(day: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(asDate(day));
}

export function HomeDashboard() {
  const { mode, profile, progress } = useScriptura();
  const today = useToday();

  if (mode === "loading" || !today) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const companion = getCompanion(profile.companionId);
  const counts = progress.today.day === today.day ? progress.today.counts : {};
  const quests = questStatuses(today.day, counts);
  const questsLeft = quests.filter((q) => !q.completed).length;
  // The companion's line rotates through the day.
  const message = companion.messages[(dayOfYear(today.day) + today.hour) % companion.messages.length];
  const next = nextTrailStep(progress);

  return (
    <div className="space-y-8">
      {mode === "guest" && (
        <div className="glass flex items-center justify-between gap-3 rounded-full border border-dashed border-line py-1 pl-4 pr-1 text-xs text-muted sm:text-sm">
          <span>
            <strong className="text-ink">Modo visitante.</strong> Seu progresso fica só neste aparelho.
          </span>
          <Link href="/entrar?modo=criar" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 font-bold text-primary hover:bg-primary-soft">
            <UserPlus className="size-4" /> Criar conta
          </Link>
        </div>
      )}

      <Hero
        day={today.day}
        hello={`${greeting(today.hour)},`}
        name={profile.displayName}
        subtitle={
          questsLeft === 0
            ? "Dia completo! Todas as missões feitas. Volte amanhã para manter a ofensiva."
            : `${questsLeft === 1 ? "Falta 1 missão" : `Faltam ${questsLeft} missões`} para fechar o dia.`
        }
        cta={next ? { href: next.href, label: next.passed > 0 ? "Continuar trilha" : "Começar uma trilha" } : { href: "/biblia", label: "Ler a Bíblia" }}
      />

      <TodayStrip day={today.day} />

      <section className="flex items-end gap-3">
        <CompanionAvatar id={companion.id} size={88} float className="shrink-0" />
        <p className="glass mb-4 flex-1 rounded-2xl rounded-bl-sm border border-line px-4 py-3 text-sm shadow-card sm:text-base">
          <span className="block tabular-nums text-[11px] font-bold uppercase tracking-[0.16em] text-violet">{companion.name}</span>
          {message}
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="glass rounded-2xl border border-line p-5 shadow-card">
          <SectionTitle eyebrow="Renovam à meia-noite" title="Missões do dia" />
          <ul className="space-y-1.5">
            {quests.map(({ quest, progress: done, completed }) => (
              <li key={quest.id}>
                <Link href={quest.href} className={clsx("flex min-h-12 items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2", completed && "opacity-70")}>
                  <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", completed ? "bg-gradient-accent text-white" : "bg-primary-soft text-primary")}>
                    {completed ? <Check className="size-5" /> : <Sparkles className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-sm font-semibold", completed && "line-through")}>{quest.title}</span>
                    <span className="block text-xs text-muted">{quest.description}</span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block tabular-nums font-semibold text-gold">+{quest.xp}</span>
                    <span className="tabular-nums text-muted">
                      {done}/{quest.target}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Complete as três para ganhar +{FULL_DAY_BONUS} XP de bônus.</p>
        </section>
        <DailyVerse day={today.day} />
      </div>

      <section>
        <SectionTitle
          title="Suas trilhas"
          action={
            <Link href="/trilhas" className="flex min-h-11 items-center text-sm font-bold text-primary">
              Ver todas
            </Link>
          }
        />
        <ul className="-mx-4 grid snap-x snap-mandatory auto-cols-[minmax(15rem,78%)] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {TRAILS.map((trail) => (
            <li key={trail.id} className="snap-start">
              <TrailCard trail={trail} compact />
            </li>
          ))}
        </ul>
      </section>

      <ContinueReading />
    </div>
  );
}

function nextTrailStep(progress: ReturnType<typeof useScriptura>["progress"]) {
  const all = TRAILS.map((trail) => ({ trail, p: trailProgress(trail, progress) }));
  const pick = all.find(({ p }) => p.passed > 0 && !p.completed) ?? all.find(({ p }) => !p.completed);
  if (!pick) return null;
  const key = pick.trail.steps[pick.p.current];
  return { trail: pick.trail, key, passed: pick.p.passed, total: pick.p.total, href: stepHref(key, pick.trail.id) };
}

function Hero({ day, hello, name, subtitle, cta }: { day: string; hello: string; name: string; subtitle: string; cta: { href: string; label: string } }) {
  const { progress } = useScriptura();
  const level = levelProgress(progress.xp);
  const streak = effectiveStreak(progress.streak, day);
  const atRisk = streakAtRisk(progress.streak, day);
  const { lastActiveDay, current } = progress.streak;

  // The last 7 days, marking those inside the current run.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDay(day, i - 6);
    const back = lastActiveDay ? daysBetween(d, lastActiveDay) : -1;
    return { day: d, label: WEEKDAY_INITIALS[asDate(d).getUTCDay()], active: back >= 0 && back < current, today: d === day };
  });

  return (
    <section className="glass relative grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border border-line p-5 shadow-card sm:p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-violet/20 blur-3xl" aria-hidden />
      <div className="relative flex min-w-0 flex-col items-start gap-2">
        <p className="tabular-nums text-[11px] uppercase tracking-[0.18em] text-primary">{longDate(day)}</p>
        <h1 className="break-words font-display text-[clamp(1.75rem,8vw,3rem)] font-extrabold leading-[1.02] tracking-tight">
          {hello} <span className="text-gradient">{name}</span>
        </h1>
        <p className="mb-2 max-w-md text-muted">{subtitle}</p>
        <ButtonLink href={cta.href} className="min-h-12 px-5 text-base">
          {cta.label} <ArrowRight className="size-5" />
        </ButtonLink>
      </div>

      <div className="relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
        <div
          className="size-24 rounded-full p-1.5"
          style={{ background: `conic-gradient(var(--primary), var(--violet) ${level.ratio * 100}%, var(--surface-2) ${level.ratio * 100}%)` }}
          role="img"
          aria-label={`Nível ${level.level}, ${Math.round(level.ratio * 100)}% para o próximo`}
        >
          <div className="grid size-full place-items-center rounded-full bg-bg">
            <div className="text-center leading-none">
              <span className="block tabular-nums text-[10px] uppercase tracking-[0.14em] text-primary">Nível</span>
              <span className="tabular-nums text-3xl font-bold">{level.level}</span>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight">{level.rank.name}</p>
          <p className="truncate text-sm italic text-muted">“{level.title}”</p>
          <p className="tabular-nums text-xs text-muted">
            {level.current}/{level.needed} XP
          </p>
        </div>

        <div className="col-span-2 space-y-2 rounded-2xl border border-gold-bright/30 bg-gold-soft p-3">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-gold-bright" aria-hidden />
            <span className="tabular-nums font-bold text-gold">
              {streak} {streak === 1 ? "dia" : "dias"}
            </span>
            <span className="text-sm text-muted">de ofensiva</span>
            <span className="ml-auto flex gap-0.5" title="Escudos da Fé: protegem um dia perdido (ganhe 1 a cada 7 dias seguidos)">
              {Array.from({ length: MAX_SHIELDS }, (_, i) => (
                <Shield key={i} className={clsx("size-4", i < progress.streak.shields ? "fill-primary/20 text-primary" : "text-muted opacity-40")} aria-hidden />
              ))}
              <span className="sr-only">{progress.streak.shields} escudos</span>
            </span>
          </div>
          <ol className="grid grid-cols-7 gap-1.5" aria-label="Últimos 7 dias">
            {week.map((d) => (
              <li
                key={d.day}
                className={clsx(
                  "grid h-8 place-items-center rounded-lg border tabular-nums text-xs font-bold",
                  d.active ? "bg-gradient-gold border-transparent text-[#2a1d05]" : d.today ? "border-2 border-dashed border-gold-bright text-gold" : "border-line bg-surface text-muted",
                )}
                aria-label={`${d.day}${d.active ? ": estudou" : ""}`}
              >
                {d.label}
              </li>
            ))}
          </ol>
          {atRisk && <p className="text-xs font-semibold text-gold">Estude hoje para não perder a ofensiva.</p>}
        </div>
      </div>
    </section>
  );
}

/** The three daily loops: continue a trail, the word of the day, memorization reviews. */
function TodayStrip({ day }: { day: string }) {
  const { progress, annotations } = useScriptura();
  const next = nextTrailStep(progress);
  const wordDone = progress.today.day === day && (progress.today.counts.daily_word_solved ?? 0) > 0;
  const deck = Object.entries(annotations).filter(([, a]) => a.favorite);
  const due = deck.filter(([, a]) => isDue(a.review ?? undefined, day)).length;
  const reviewedToday = progress.today.day === day && (progress.today.counts.verse_reviewed ?? 0) > 0;

  const tiles = [
    next
      ? {
          href: next.href,
          icon: BookOpen,
          tone: "bg-gradient-primary",
          eyebrow: `${next.trail.title} · etapa ${next.passed + 1}/${next.total}`,
          title: `Ler ${stepLabel(next.key)}`,
          meta: "Leitura + quiz de 3 perguntas",
          pill: `até +${STEP_XP} XP`,
          done: false,
        }
      : { href: "/trilhas", icon: Route, tone: "bg-gradient-primary", eyebrow: "Trilhas", title: "Todas concluídas", meta: "Revise quando quiser", pill: "", done: true },
    {
      href: "/jogos/palavra-do-dia",
      icon: Puzzle,
      tone: "bg-gradient-gold text-[#2a1d05]",
      eyebrow: "Desafio diário",
      title: "Palavra do Dia",
      meta: wordDone ? "Resolvida · volte amanhã" : "Adivinhe em 6 tentativas",
      pill: "até +30 XP",
      done: wordDone,
    },
    {
      href: "/memorizar",
      icon: Brain,
      tone: "bg-gradient-accent",
      eyebrow: "Memorização",
      title: deck.length === 0 ? "Monte seu baralho" : due > 0 ? `Revisar ${due} versículo${due > 1 ? "s" : ""}` : "Revisão em dia",
      meta: "Repetição espaçada",
      pill: `+${REVIEW_XP} XP/cartão`,
      done: deck.length > 0 && due === 0 && reviewedToday,
    },
  ];
  const doneCount = tiles.filter((t) => t.done).length;

  return (
    <section>
      <SectionTitle
        title="Hoje no Scriptura"
        action={
          <span className="tabular-nums text-xs text-muted">
            {doneCount}/{tiles.length} feitas
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map(({ href, icon: Icon, tone, eyebrow, title, meta, pill, done }) => {
          const badge = (done || pill) && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 tabular-nums text-[11px] font-bold text-gold">{done ? "✓ feito" : pill}</span>
          );
          return (
            <Link
              key={eyebrow}
              href={href}
              className={clsx(
                "glass premium-lift flex min-h-20 items-center gap-3 rounded-2xl border border-line p-3 pr-4 shadow-card md:flex-col md:items-stretch md:p-4",
                done && "opacity-65",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={clsx("grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-card", tone)}>
                  <Icon className="size-6" />
                </span>
                <span className="hidden md:inline">{badge}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate tabular-nums text-[10px] uppercase tracking-[0.16em] text-primary">{eyebrow}</span>
                <span className="block truncate font-bold">{title}</span>
                <span className="block truncate text-xs text-muted">{meta}</span>
              </span>
              <span className="md:hidden">{badge}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DailyVerse({ day }: { day: string }) {
  const { record, progress } = useScriptura();
  const verse = dailyVerses[(dayOfYear(day) - 1) % dailyVerses.length];
  const done = progress.today.day === day && (progress.today.counts.daily_verse_read ?? 0) > 0;
  return (
    <section className="glass gradient-border flex flex-col justify-center rounded-2xl p-6 text-center shadow-card">
      <p className="tabular-nums text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Versículo do dia</p>
      <blockquote className="mx-auto mt-3 max-w-xl font-scripture text-lg leading-relaxed sm:text-xl">“{verse.text}”</blockquote>
      <p className="mt-2 font-semibold text-primary">{verse.reference}</p>
      <div className="mt-4">
        {done ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="size-4" /> Você meditou neste versículo hoje
          </p>
        ) : (
          <Button variant="gold" className="min-h-11" onClick={() => record({ type: "daily_verse_read" })}>
            Meditei nesta palavra
          </Button>
        )}
      </div>
    </section>
  );
}
