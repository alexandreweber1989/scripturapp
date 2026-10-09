"use client";

import { BookOpen, Check } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { type BibleBook, chapterHref, chapterKey, getBook } from "@/domain/bible/books";
import { useScriptura } from "@/lib/client/store";
import { ProgressBar } from "../ui";

const LAST_READ_KEY = "scriptura:v1:last-read";

export function rememberLastRead(bookId: string, chapter: number) {
  try {
    window.localStorage.setItem(LAST_READ_KEY, `${bookId}.${chapter}`);
    window.dispatchEvent(new Event("scriptura:last-read"));
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("scriptura:last-read", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("scriptura:last-read", callback);
    window.removeEventListener("storage", callback);
  };
}

function readLastRead(): string | null {
  try {
    return window.localStorage.getItem(LAST_READ_KEY);
  } catch {
    return null;
  }
}

/** The last chapter opened on this device. */
export function useLastRead(): { book: BibleBook; chapter: number } | null {
  const raw = useSyncExternalStore(subscribe, readLastRead, () => null);
  if (!raw) return null;
  const [id, ch] = raw.split(".");
  const book = getBook(id);
  const chapter = Number(ch);
  return book && chapter >= 1 && chapter <= book.chapters ? { book, chapter } : null;
}

export function ContinueReading() {
  const last = useLastRead();
  if (!last) return null;
  return (
    <Link
      href={chapterHref(last.book, last.chapter)}
      className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary-soft px-5 py-4 transition hover:shadow-card"
    >
      <BookOpen className="size-6 text-primary" aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Continuar lendo</p>
        <p className="font-serif text-lg font-semibold">
          {last.book.name} {last.chapter}
        </p>
      </div>
    </Link>
  );
}

export function BookReadCount({ bookId, total }: { bookId: string; total: number }) {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return <>{total} capítulos</>;
  const read = progress.readChapters.filter((k) => k.startsWith(`${bookId}.`)).length;
  if (read === 0) return <>{total} capítulos</>;
  if (read === total)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-success">
        <Check className="size-3.5" /> Lido
      </span>
    );
  return (
    <>
      {read}/{total} lidos
    </>
  );
}

export function BookProgress({ book }: { book: BibleBook }) {
  const { progress } = useScriptura();
  const read = progress.readChapters.filter((k) => k.startsWith(`${book.id}.`)).length;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-muted">
        <span>Seu progresso</span>
        <span>
          {read}/{book.chapters}
        </span>
      </div>
      <ProgressBar value={read / book.chapters} tone="success" />
    </div>
  );
}

export function ChapterGrid({ book }: { book: BibleBook }) {
  const { progress } = useScriptura();
  const read = new Set(progress.readChapters);
  return (
    <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => {
        const done = read.has(chapterKey(book.id, chapter));
        return (
          <li key={chapter}>
            <Link
              href={chapterHref(book, chapter)}
              className={
                done
                  ? "grid aspect-square place-items-center rounded-xl bg-success-soft font-semibold text-success"
                  : "grid aspect-square place-items-center rounded-xl border border-line bg-surface font-semibold hover:border-primary/60"
              }
              aria-label={`Capítulo ${chapter}${done ? " (lido)" : ""}`}
            >
              {chapter}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
