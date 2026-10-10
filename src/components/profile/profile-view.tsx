"use client";

import clsx from "clsx";
import { Heart, Lock, LogIn, LogOut, NotebookPen, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "@/components/transition-link";
import { useState } from "react";
import { TOTAL_CHAPTERS, chapterHref, formatReference, parseVerseKey } from "@/domain/bible/books";
import { COMPANIONS } from "@/domain/companions";
import { ACHIEVEMENTS, type AchievementTier } from "@/domain/progression/achievements";
import { levelProgress } from "@/domain/progression/levels";
import { TRAILS } from "@/domain/trails";
import { relicImage } from "@/lib/assets";
import { useScriptura } from "@/lib/client/store";
import { CompanionAvatar } from "../companion-avatar";
import { ThemeSelector } from "../theme-toggle";
import { Button, Card, ProgressBar, SectionTitle, Skeleton } from "../ui";

const TIER_STYLE: Record<AchievementTier, string> = {
  bronze: "from-[#c98b54] to-[#8a5a2b]",
  prata: "from-[#d6dbe3] to-[#8d96a6]",
  ouro: "from-gold-bright to-gold",
  lendario: "from-[#b18cff] to-[#5b3fd1]",
};

export function ProfileView() {
  const { mode, email, profile, progress, annotations, updateProfile, signOut } = useScriptura();
  const [name, setName] = useState<string | null>(null);

  if (mode === "loading") return <Skeleton className="h-96" />;

  const level = levelProgress(progress.xp);
  const favorites = Object.entries(annotations).filter(([, a]) => a.favorite);
  const notes = Object.entries(annotations).filter(([, a]) => a.note);
  const stats = [
    { label: "XP total", value: progress.xp },
    { label: "Capítulos lidos", value: `${progress.readChapters.length}/${TOTAL_CHAPTERS}` },
    { label: "Maior sequência", value: `${progress.streak.longest} dias` },
    { label: "Quizzes", value: progress.totals.quiz_completed ?? 0 },
    { label: "Favoritos", value: favorites.length },
    { label: "Reflexões", value: notes.length },
  ];

  const saveName = async () => {
    const value = name?.trim();
    if (value && value !== profile.displayName) await updateProfile({ displayName: value.slice(0, 60) });
    setName(null);
  };

  return (
    <div className="space-y-10">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CompanionAvatar id={profile.companionId} size={96} className="self-center" />
        <div className="flex-1 space-y-2">
          {name === null ? (
            <button onClick={() => setName(profile.displayName)} className="font-display text-3xl font-bold hover:text-primary" title="Editar nome">
              {profile.displayName}
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveName();
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 font-display text-xl outline-none focus:border-primary"
                aria-label="Seu nome"
              />
              <Button type="submit">Salvar</Button>
            </form>
          )}
          <p className="text-sm text-muted">
            Nível {level.level} · {level.rank.name} · <span className="italic">“{level.title}”</span>
          </p>
          <ProgressBar value={level.ratio} tone="gold" />
          <p className="text-xs text-muted">
            {level.needed - level.current} XP para o nível {level.level + 1}
          </p>
        </div>
      </Card>

      <section>
        <SectionTitle title="Estatísticas" />
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl glass border border-line p-4">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="tabular-nums text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionTitle eyebrow={`${progress.achievements.length}/${ACHIEVEMENTS.length}`} title="Conquistas" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = progress.achievements.includes(a.id);
            return (
              <li key={a.id} className={clsx("rounded-2xl glass border border-line p-4 text-center", !unlocked && "opacity-55")}>
                <div
                  className={clsx(
                    "mx-auto mb-2 grid size-12 place-items-center rounded-full bg-gradient-to-br text-white shadow-card",
                    unlocked ? TIER_STYLE[a.tier] : "from-surface-2 to-surface-2 text-muted",
                  )}
                >
                  {unlocked ? <Trophy className="size-6" /> : <Lock className="size-5" />}
                </div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle eyebrow={`${progress.trailsMastered.length}/${TRAILS.length}`} title="Relíquias" />
        <ul className="grid grid-cols-3 gap-3">
          {TRAILS.map((t) => {
            const owned = progress.trailsMastered.includes(t.id);
            return (
              <li key={t.id}>
                <Link href={`/trilhas/${t.id}`} className="glass premium-lift flex h-full flex-col overflow-hidden rounded-2xl border border-line">
                  <span className="relative aspect-square bg-[radial-gradient(circle,var(--gold-soft),transparent_70%)]">
                    <Image
                      src={relicImage(t.id)}
                      alt={t.relic}
                      fill
                      sizes="(min-width: 640px) 14rem, 33vw"
                      className={clsx("object-cover", !owned && "blur-[1px] brightness-75 grayscale")}
                    />
                    {!owned && (
                      <span className="absolute inset-0 m-auto grid size-9 place-items-center rounded-full bg-black/60 text-white">
                        <Lock className="size-4" aria-label="Bloqueada" />
                      </span>
                    )}
                  </span>
                  <span className="p-3">
                    <span className="block text-sm font-bold leading-tight">{t.relic}</span>
                    <span className="hidden text-xs text-muted sm:block">{owned ? `Trilha ${t.title} dominada` : `Domine a trilha ${t.title}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle title="Seu companheiro de jornada" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COMPANIONS.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => updateProfile({ companionId: c.id })}
                className={clsx(
                  "flex w-full flex-col items-center gap-1 glass rounded-2xl border p-3 transition",
                  c.id === profile.companionId ? "border-primary ring-2 ring-primary/30" : "border-line hover:border-primary/50",
                )}
                aria-pressed={c.id === profile.companionId}
              >
                <CompanionAvatar id={c.id} size={72} />
                <span className="font-semibold">{c.name}</span>
                <span className="text-center text-xs text-muted">{c.trait}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle title="Aparência" />
        <ThemeSelector />
      </section>

      {(favorites.length > 0 || notes.length > 0) && (
        <section className="grid gap-6 md:grid-cols-2">
          <VerseList title="Favoritos" icon={<Heart className="size-4 text-danger" />} entries={favorites.map(([k]) => [k, null])} />
          <VerseList title="Reflexões" icon={<NotebookPen className="size-4 text-primary" />} entries={notes.map(([k, a]) => [k, a.note])} />
        </section>
      )}

      <Card className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        {mode === "account" ? (
          <>
            <p className="text-sm">
              Conectado como <strong>{email}</strong>
            </p>
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="size-4" /> Sair
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm">Crie uma conta para guardar seu progresso na nuvem e usar o mentor.</p>
            <Link href="/entrar" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">
              <LogIn className="size-4" /> Entrar ou criar conta
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

function VerseList({ title, icon, entries }: { title: string; icon: React.ReactNode; entries: [string, string | null][] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        {icon} {title}
      </h3>
      <ul className="space-y-2">
        {entries.slice(0, 30).map(([key, note]) => {
          const ref = parseVerseKey(key);
          if (!ref) return null;
          return (
            <li key={key}>
              <Link href={chapterHref(ref.book, ref.chapter)} className="block rounded-xl glass border border-line px-3 py-2 hover:border-primary/50">
                <span className="text-sm font-semibold text-primary">{formatReference(ref.book, ref.chapter, ref.verse)}</span>
                {note && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{note}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
