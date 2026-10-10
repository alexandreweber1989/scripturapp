"use client";

import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Copy, Heart, MessageCircle, NotebookPen, Type, X } from "lucide-react";
import Link from "@/components/transition-link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { chapterKey, formatReference, getBook, verseKey } from "@/domain/bible/books";
import type { ChapterQuestion } from "@/domain/games/chapter-quiz";
import { HIGHLIGHT_COLORS, type HighlightColor, useScriptura } from "@/lib/client/store";
import { navigationTypes } from "@/lib/transitions";
import { Button } from "../ui";
import { ChapterQuiz } from "./chapter-quiz";
import { rememberLastRead } from "./reading-progress";

interface Neighbor {
  slug: string;
  name: string;
  chapter: number;
}

const HIGHLIGHT_CLASS: Record<HighlightColor, string> = {
  ouro: "bg-hl-ouro",
  oliva: "bg-hl-oliva",
  ceu: "bg-hl-ceu",
  rosa: "bg-hl-rosa",
  lavanda: "bg-hl-lavanda",
};

const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
  ouro: "Ouro",
  oliva: "Oliva",
  ceu: "Céu",
  rosa: "Rosa",
  lavanda: "Lavanda",
};

const FONT_SIZES = ["text-base", "text-lg", "text-xl", "text-2xl"] as const;
const FONT_KEY = "scriptura:v1:font-size";

function subscribeFontSize(callback: () => void) {
  window.addEventListener("scriptura:font-size", callback);
  return () => window.removeEventListener("scriptura:font-size", callback);
}

function readFontSize(): number {
  try {
    const value = Number(window.localStorage.getItem(FONT_KEY));
    return Number.isInteger(value) && value >= 0 && value < FONT_SIZES.length ? value : 1;
  } catch {
    return 1;
  }
}

export function ChapterReader({
  bookId,
  chapter,
  verses,
  translation,
  prev,
  next,
  quiz,
}: {
  bookId: string;
  chapter: number;
  verses: string[];
  translation: string;
  prev: Neighbor | null;
  next: Neighbor | null;
  quiz?: ChapterQuestion[];
}) {
  const book = getBook(bookId)!;
  const router = useRouter();
  const pathname = usePathname();
  const trailId = useSearchParams().get("trilha");
  const { annotations, annotate, record, progress, mode } = useScriptura();
  const [selected, setSelected] = useState<number[]>([]);
  const fontSize = useSyncExternalStore(subscribeFontSize, readFontSize, () => 1);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [completedNow, setCompletedNow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    rememberLastRead(bookId, chapter);
  }, [bookId, chapter]);

  const changeFont = (delta: number) => {
    const value = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSize + delta));
    try {
      window.localStorage.setItem(FONT_KEY, String(value));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("scriptura:font-size"));
  };

  const toggle = (verse: number) => {
    setNoteDraft(null);
    setSelected((s) => (s.includes(verse) ? s.filter((v) => v !== verse) : [...s, verse].sort((a, b) => a - b)));
  };

  const keys = selected.map((v) => verseKey(bookId, chapter, v));
  const first = selected[0];
  const reference =
    selected.length === 0
      ? ""
      : selected.length === 1
        ? formatReference(book, chapter, first)
        : `${formatReference(book, chapter, first)}-${selected.at(-1)}`;
  const allFavorite = keys.length > 0 && keys.every((k) => annotations[k]?.favorite);

  const applyHighlight = async (color: HighlightColor | null) => {
    for (const key of keys) await annotate(key, { highlight: color });
    setSelected([]);
  };

  const toggleFavorite = async () => {
    for (const key of keys) await annotate(key, { favorite: !allFavorite });
  };

  const copy = async () => {
    const text = selected.map((v) => verses[v - 1]).join(" ");
    await navigator.clipboard.writeText(`"${text}" — ${reference} (${translation})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const askMentor = () => {
    const text = selected.map((v) => verses[v - 1]).join(" ");
    const question = `Me ajude a entender ${reference}: "${text}"`;
    router.push(`/mentor?pergunta=${encodeURIComponent(question)}`, { transitionTypes: navigationTypes(pathname, "/mentor") });
  };

  const saveNote = async () => {
    if (noteDraft === null || first === undefined) return;
    await annotate(verseKey(bookId, chapter, first), { note: noteDraft.trim() || null });
    setNoteDraft(null);
    setSelected([]);
  };

  const alreadyRead = progress.readChapters.includes(chapterKey(bookId, chapter));
  const complete = async () => {
    // A repeat on the same day simply yields no reward; either way the reading is done.
    await record({ type: "chapter_read", book: bookId, chapter });
    setCompletedNow(true);
  };

  return (
    <article className="pb-40">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link href={`/biblia/${book.slug}`} className="text-sm font-medium text-muted hover:text-primary">
            {book.name}
          </Link>
          <h1 className="font-display text-3xl font-bold">
            {book.name} {chapter}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{translation}</span>
          <button onClick={() => changeFont(-1)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Diminuir texto">
            <Type className="size-4" />
          </button>
          <button onClick={() => changeFont(1)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Aumentar texto">
            <Type className="size-6" />
          </button>
        </div>
      </header>

      <div className={clsx("font-scripture leading-[1.9] text-ink", FONT_SIZES[fontSize])}>
        {verses.map((text, i) => {
          const number = i + 1;
          const key = verseKey(bookId, chapter, number);
          const a = annotations[key];
          const isSelected = selected.includes(number);
          return (
            <span key={number}>
              <span
                role="button"
                tabIndex={0}
                onClick={() => toggle(number)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(number))}
                className={clsx(
                  "cursor-pointer rounded-sm decoration-primary decoration-2 underline-offset-4 transition-colors",
                  a?.highlight && HIGHLIGHT_CLASS[a.highlight],
                  isSelected && "underline decoration-dotted",
                )}
              >
                {number === 1 ? (
                  <span className="float-left mr-2 mt-1 select-none font-display text-[3.2em] font-bold leading-[0.8] text-gold" aria-label="versículo 1">
                    {chapter}
                  </span>
                ) : (
                  <sup className="mr-1 select-none font-sans text-[0.6em] font-bold text-gold">{number}</sup>
                )}
                {text}
              </span>
              {a?.favorite && <Heart className="mx-0.5 inline size-3.5 fill-danger text-danger" aria-label="Favorito" />}
              {a?.note && (
                <button
                  onClick={() => setOpenNote(openNote === number ? null : number)}
                  className="mx-0.5 inline-flex align-middle text-primary"
                  aria-label="Ver reflexão"
                >
                  <NotebookPen className="size-4" />
                </button>
              )}
              {openNote === number && a?.note && (
                <span className="my-2 block rounded-xl border-l-4 border-primary bg-primary-soft px-4 py-2 font-sans text-sm text-ink">
                  {a.note}
                </span>
              )}{" "}
            </span>
          );
        })}
      </div>

      <section className="mt-12 flex flex-col items-center gap-4 rounded-2xl glass border border-line p-6 text-center">
        {completedNow ? (
          <>
            <p className="flex items-center gap-2 font-semibold text-success">
              <Check className="size-5" /> Leitura registrada. Que a Palavra frutifique em você!
            </p>
            {quiz && <ChapterQuiz bookId={bookId} chapter={chapter} questions={quiz} trailId={trailId} />}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{alreadyRead ? "Você já leu este capítulo antes. Ler de novo também conta hoje." : "Terminou a leitura?"}</p>
            <Button onClick={complete} disabled={mode === "loading"}>
              <Check className="size-4" /> Concluir capítulo
            </Button>
          </>
        )}
        <div className="flex w-full justify-between gap-2 text-sm">
          {prev ? (
            <Link href={`/biblia/${prev.slug}/${prev.chapter}`} className="flex items-center gap-1 font-medium text-primary">
              <ChevronLeft className="size-4" /> {prev.name} {prev.chapter}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/biblia/${next.slug}/${next.chapter}`} className="flex items-center gap-1 font-medium text-primary">
              {next.name} {next.chapter} <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </section>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-3 md:bottom-6 md:pl-60">
          <div className="animate-rise w-full max-w-xl rounded-2xl glass border border-line p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-bold">{reference}</p>
              <button onClick={() => setSelected([])} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Cancelar seleção">
                <X className="size-4" />
              </button>
            </div>

            {noteDraft !== null ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  maxLength={4000}
                  rows={4}
                  placeholder="O que Deus está falando com você neste versículo?"
                  className="w-full rounded-xl border border-line bg-bg p-3 text-sm outline-none focus:border-primary"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setNoteDraft(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveNote}>Salvar reflexão</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => applyHighlight(color)}
                      className={clsx("size-8 rounded-full border-2 border-surface ring-1 ring-line", HIGHLIGHT_CLASS[color])}
                      aria-label={`Destacar em ${HIGHLIGHT_LABEL[color]}`}
                    />
                  ))}
                  <button onClick={() => applyHighlight(null)} className="ml-1 text-xs font-medium text-muted hover:text-ink">
                    Remover
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <ActionButton onClick={toggleFavorite} label={allFavorite ? "Desfavoritar" : "Favoritar"}>
                    <Heart className={clsx("size-5", allFavorite && "fill-danger text-danger")} />
                  </ActionButton>
                  <ActionButton
                    onClick={() => setNoteDraft(annotations[verseKey(bookId, chapter, first)]?.note ?? "")}
                    label="Reflexão"
                    disabled={selected.length !== 1}
                  >
                    <NotebookPen className="size-5" />
                  </ActionButton>
                  <ActionButton onClick={copy} label={copied ? "Copiado!" : "Copiar"}>
                    {copied ? <Check className="size-5 text-success" /> : <Copy className="size-5" />}
                  </ActionButton>
                  <ActionButton onClick={askMentor} label="Mentor">
                    <MessageCircle className="size-5" />
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ActionButton({ children, label, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
      {...props}
    >
      {children}
      {label}
    </button>
  );
}
