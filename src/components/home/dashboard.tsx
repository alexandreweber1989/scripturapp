"use client";

import clsx from "clsx";
import { BookOpen, Check, Flame, Gamepad2, MessageCircle, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import dailyVerses from "@/content/daily-verses.json";
import { getCompanion } from "@/domain/companions";
import { levelProgress } from "@/domain/progression/levels";
import { FULL_DAY_BONUS, questStatuses } from "@/domain/progression/quests";
import { effectiveStreak, streakAtRisk } from "@/domain/progression/streak";
import { dayKey, dayOfYear } from "@/domain/time";
import { useScriptura } from "@/lib/client/store";
import { ContinueReading } from "../bible/reading-progress";
import { CompanionAvatar } from "../companion-avatar";
import { Button, Card, ProgressBar, SectionTitle, Skeleton } from "../ui";

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

export function HomeDashboard() {
  const { mode, profile, progress } = useScriptura();
  const today = useToday();
  const companion = getCompanion(profile.companionId);

  if (mode === "loading" || !today) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  // The companion's line rotates through the day.
  const messageIndex = (dayOfYear(today.day) + today.hour) % companion.messages.length;
  const level = levelProgress(progress.xp);
  const streak = effectiveStreak(progress.streak, today.day);
  const atRisk = streakAtRisk(progress.streak, today.day);
  const counts = progress.today.day === today.day ? progress.today.counts : {};
  const quests = questStatuses(today.day, counts);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-primary-soft via-surface to-gold-soft p-6 shadow-card">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-center">
            <div className="absolute inset-2 rounded-full bg-gold-bright/25 blur-2xl" aria-hidden />
            <CompanionAvatar id={companion.id} size={112} float className="relative" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm text-muted">{greeting(today.hour)},</p>
              <h1 className="font-serif text-3xl font-semibold">{profile.displayName}</h1>
            </div>
            <p className="rounded-2xl rounded-tl-sm bg-surface/80 px-4 py-2 text-sm shadow-sm">
              <span className="font-semibold text-primary">{companion.name}:</span> {companion.messages[messageIndex]}
            </p>
            <div>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">
                  Nível {level.level} · {level.rank.name}
                </span>
                <span className="text-muted">
                  {level.current}/{level.needed} XP
                </span>
              </div>
              <ProgressBar value={level.ratio} tone="gold" className="h-2.5" />
              <p className="mt-1 text-xs italic text-muted">“{level.title}”</p>
            </div>
          </div>
        </div>
      </section>

      {mode === "guest" && (
        <Card className="flex flex-col items-start justify-between gap-3 border-primary/30 sm:flex-row sm:items-center">
          <p className="text-sm">
            Você está no <strong>modo visitante</strong>: seu progresso fica salvo só neste aparelho.
          </p>
          <Link href="/entrar" className="text-sm font-semibold text-primary">
            Criar conta grátis →
          </Link>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Streak */}
        <Card className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={clsx("grid size-14 place-items-center rounded-2xl", streak > 0 ? "bg-flame/15 text-flame" : "bg-surface-2 text-muted")}>
              <Flame className="size-8" />
            </div>
            <div>
              <p className="font-serif text-3xl font-semibold">
                {streak} {streak === 1 ? "dia" : "dias"}
              </p>
              <p className="text-sm text-muted">Fogo Santo · recorde {progress.streak.longest}</p>
            </div>
          </div>
          <p className="text-sm">
            {progress.streak.lastActiveDay === today.day
              ? "Sequência garantida hoje. Volte amanhã!"
              : atRisk
                ? "Faça qualquer atividade hoje para não perder sua sequência."
                : "Comece hoje uma nova sequência de estudos."}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted">
            {[0, 1].map((i) => (
              <Shield key={i} className={clsx("size-5", i < progress.streak.shields ? "fill-primary/20 text-primary" : "opacity-30")} />
            ))}
            <span>Escudos da Fé: protegem um dia perdido (ganhe 1 a cada 7 dias seguidos)</span>
          </div>
        </Card>

        {/* Quests */}
        <Card className="space-y-3">
          <SectionTitle eyebrow="Renovam à meia-noite" title="Missões do dia" />
          <ul className="space-y-2.5">
            {quests.map(({ quest, progress: done, completed }) => (
              <li key={quest.id}>
                <Link href={quest.href} className={clsx("flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2", completed && "opacity-70")}>
                  <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", completed ? "bg-success text-white" : "bg-surface-2 text-muted")}>
                    {completed ? <Check className="size-5" /> : <Sparkles className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-sm font-semibold", completed && "line-through")}>{quest.title}</span>
                    <span className="block text-xs text-muted">{quest.description}</span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block font-semibold text-gold">+{quest.xp}</span>
                    <span className="text-muted">
                      {done}/{quest.target}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Complete as três para ganhar +{FULL_DAY_BONUS} XP de bônus.</p>
        </Card>
      </div>

      <DailyVerse day={today.day} />
      <ContinueReading />

      <section>
        <SectionTitle title="Para onde vamos hoje?" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Shortcut href="/biblia" icon={<BookOpen className="size-6" />} title="Ler a Bíblia" text="10 XP por capítulo" />
          <Shortcut href="/jogos" icon={<Gamepad2 className="size-6" />} title="Jogar" text="Quiz e desafios" />
          <Shortcut href="/mentor" icon={<MessageCircle className="size-6" />} title={`Falar com ${companion.name}`} text="Tire suas dúvidas" />
        </div>
      </section>
    </div>
  );
}

function DailyVerse({ day }: { day: string }) {
  const { record, progress } = useScriptura();
  const verse = dailyVerses[(dayOfYear(day) - 1) % dailyVerses.length];
  const done = progress.today.day === day && (progress.today.counts.daily_verse_read ?? 0) > 0;
  return (
    <section className="rounded-3xl border border-gold/30 bg-surface p-6 text-center shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Versículo do dia</p>
      <blockquote className="mx-auto mt-3 max-w-2xl font-serif text-xl leading-relaxed sm:text-2xl">“{verse.text}”</blockquote>
      <p className="mt-3 font-semibold text-primary">{verse.reference}</p>
      <div className="mt-5">
        {done ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="size-4" /> Você meditou neste versículo hoje
          </p>
        ) : (
          <Button variant="gold" onClick={() => record({ type: "daily_verse_read" })}>
            Meditei nesta palavra
          </Button>
        )}
      </div>
    </section>
  );
}

function Shortcut({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/50 hover:shadow-card">
      <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
    </Link>
  );
}
