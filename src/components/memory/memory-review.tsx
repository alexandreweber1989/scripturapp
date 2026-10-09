"use client";

import clsx from "clsx";
import { Brain, Check, Eye, Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { chapterHref, formatReference, parseVerseKey } from "@/domain/bible/books";
import { GRADES, type ReviewGrade, clozeVerse, gradeReview, isDue, isMemorized, newReview } from "@/domain/memory/srs";
import { dayKey } from "@/domain/time";
import { useScriptura } from "@/lib/client/store";
import { Button, Card, ProgressBar, Skeleton } from "../ui";

/** Classic verses offered when the deck is empty. */
const STARTER_VERSES = ["jo.3.16", "ps.23.1", "fp.4.13", "pv.3.5", "js.1.9"];

function subscribeDay(callback: () => void) {
  const timer = setInterval(callback, 60_000);
  return () => clearInterval(timer);
}

function useVerseTexts(keys: string[]) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const wanted = keys.filter((k) => !(k in texts)).join(",");
  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    fetch(`/api/versiculos?k=${wanted}`)
      .then((r) => (r.ok ? r.json() : { verses: {} }))
      .then((data: { verses: Record<string, string> }) => {
        if (!cancelled) setTexts((t) => ({ ...t, ...data.verses }));
      });
    return () => {
      cancelled = true;
    };
  }, [wanted]);
  return texts;
}

const label = (key: string) => {
  const ref = parseVerseKey(key);
  return ref ? formatReference(ref.book, ref.chapter, ref.verse) : key;
};

export function MemoryReview() {
  const { annotations, annotate, record, mode } = useScriptura();
  const today = useSyncExternalStore(subscribeDay, () => dayKey(), () => null);
  const deck = Object.entries(annotations)
    .filter(([, a]) => a.favorite)
    .map(([key]) => key)
    .sort();
  const due = today ? deck.filter((k) => isDue(annotations[k]?.review ?? undefined, today)) : [];
  const [current, setCurrent] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [reviewedNow, setReviewedNow] = useState(0);
  const texts = useVerseTexts(current ? [current] : due.slice(0, 1));

  if (mode === "loading" || !today) return <Skeleton className="h-96" />;

  const memorized = deck.filter((k) => isMemorized(annotations[k]?.review ?? undefined)).length;
  const active = current ?? due[0] ?? null;
  const text = active ? texts[active] : undefined;
  const review = active ? (annotations[active]?.review ?? newReview(today)) : null;
  const tokens = active && text ? clozeVerse(text, `${active}:${review?.reps ?? 0}`) : [];

  const grade = async (g: ReviewGrade) => {
    if (!active || !review) return;
    await annotate(active, { review: gradeReview(review, g, today) });
    await record({ type: "verse_reviewed", verse: active });
    setReviewedNow((n) => n + 1);
    setCurrent(null);
    setRevealed(new Set());
    setShowAll(false);
  };

  const startStarter = async () => {
    for (const key of STARTER_VERSES) await annotate(key, { favorite: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Repetição espaçada</p>
        <h1 className="font-display text-3xl font-bold">Memorização</h1>
        <p className="mt-1 text-muted">
          Seus versículos favoritos voltam no momento certo: os que você lembra aparecem cada vez menos; os que esquece, voltam amanhã.
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "No baralho", value: deck.length },
          { label: "Para hoje", value: due.length },
          { label: "Memorizados", value: memorized },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl border border-line p-4">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-mono text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {deck.length === 0 ? (
        <Card className="space-y-4 text-center">
          <Heart className="mx-auto size-8 text-danger" />
          <p className="font-display text-xl font-bold">Seu baralho está vazio</p>
          <p className="text-sm text-muted">Favorite versículos na Bíblia para memorizá-los, ou comece com 5 clássicos.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={startStarter}>
              <Sparkles className="size-4" /> Começar com 5 clássicos
            </Button>
            <Link href="/biblia" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold text-primary hover:bg-surface-2">
              Abrir a Bíblia
            </Link>
          </div>
        </Card>
      ) : !active ? (
        <Card className="space-y-3 text-center">
          <Check className="mx-auto size-8 text-success" />
          <p className="font-display text-xl font-bold">{reviewedNow > 0 ? "Revisão do dia concluída!" : "Nada para revisar hoje"}</p>
          <p className="text-sm text-muted">Volte amanhã. Quanto mais você lembra, mais espaçadas ficam as revisões.</p>
          <ProgressBar value={deck.length ? memorized / deck.length : 0} tone="success" />
          <p className="font-mono text-xs text-muted">
            {memorized}/{deck.length} memorizados
          </p>
        </Card>
      ) : (
        <Card className="gradient-border space-y-5">
          <div className="flex items-center justify-between">
            <Link href={chapterHref(parseVerseKey(active)!.book, parseVerseKey(active)!.chapter)} className="font-display text-xl font-bold hover:text-primary">
              {label(active)}
            </Link>
            <span className="flex items-center gap-1 font-mono text-xs text-muted">
              <Brain className="size-4" /> {due.length} restantes
            </span>
          </div>

          {!text ? (
            <Skeleton className="h-24" />
          ) : (
            <p className="font-scripture text-xl leading-relaxed">
              {tokens.map((t, i) =>
                t.hidden && !showAll && !revealed.has(i) ? (
                  <button
                    key={i}
                    onClick={() => setRevealed((r) => new Set(r).add(i))}
                    className="mx-0.5 inline-block min-w-12 rounded-md border-b-2 border-primary bg-primary-soft px-2 align-baseline font-sans text-sm text-primary"
                    aria-label="Revelar palavra"
                  >
                    {"·".repeat(Math.min(6, t.text.trim().length))}
                  </button>
                ) : (
                  <span key={i} className={clsx(t.hidden && "rounded bg-gold-soft px-0.5 text-gold")}>
                    {t.text}
                  </span>
                ),
              )}
            </p>
          )}

          {!showAll ? (
            <Button variant="secondary" className="w-full" onClick={() => setShowAll(true)} disabled={!text}>
              <Eye className="size-4" /> Recitei. Mostrar versículo inteiro
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-muted">Como foi?</p>
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(({ grade: g, label: l }) => (
                  <button
                    key={g}
                    onClick={() => grade(g)}
                    className={clsx(
                      "rounded-xl px-2 py-3 text-sm font-bold transition active:scale-95",
                      g === "again" && "bg-danger-soft text-danger",
                      g === "hard" && "bg-gold-soft text-gold",
                      g === "good" && "bg-primary-soft text-primary",
                      g === "easy" && "bg-gradient-accent text-white",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
