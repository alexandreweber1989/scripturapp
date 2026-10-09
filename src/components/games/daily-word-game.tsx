"use client";

import clsx from "clsx";
import { Delete, Lightbulb, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import words from "@/content/daily-words.json";
import { chapterHref } from "@/domain/bible/books";
import { parseReference } from "@/domain/bible/reference";
import {
  type DailyWord,
  type LetterState,
  MAX_GUESSES,
  WORD_LENGTH,
  evaluateGuess,
  normalizeGuess,
  shareText,
  wordForDay,
} from "@/domain/games/daily-word";
import { dayKey } from "@/domain/time";
import { useScriptura } from "@/lib/client/store";
import { Button, Card, Skeleton } from "../ui";

const KEYBOARD = ["QWERTYUIOP", "ASDFGHJKL", "+ZXCVBNM-"];
const CLUE_AFTER = 3;

function subscribeDay(callback: () => void) {
  const timer = setInterval(callback, 60_000);
  return () => clearInterval(timer);
}

interface SavedGame {
  guesses: string[];
  /** The finished game was already reported for XP. */
  recorded: boolean;
}

const storageKey = (day: string) => `scriptura:v1:palavra:${day}`;

function load(day: string): SavedGame {
  try {
    const raw = window.localStorage.getItem(storageKey(day));
    if (raw) return JSON.parse(raw) as SavedGame;
  } catch {
    // ignore
  }
  return { guesses: [], recorded: false };
}

function save(day: string, game: SavedGame) {
  try {
    window.localStorage.setItem(storageKey(day), JSON.stringify(game));
  } catch {
    // ignore
  }
}

const TILE: Record<LetterState, string> = {
  hit: "bg-gradient-accent border-transparent text-white",
  near: "bg-gradient-gold border-transparent text-[#2a1d05]",
  miss: "bg-surface-2 border-transparent text-muted",
};

export function DailyWordGame() {
  // The word depends on the visitor's day, so it is only known in the browser.
  const day = useSyncExternalStore(subscribeDay, () => dayKey(), () => null);
  if (!day) return <Skeleton className="h-[70vh]" />;
  return <Game key={day} day={day} />;
}

function Game({ day }: { day: string }) {
  const { record } = useScriptura();
  const target = wordForDay(day, words as DailyWord[]);
  const answer = target.word;
  const [game, setGame] = useState<SavedGame>(() => load(day));
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const solved = game.guesses.includes(answer);
  const finished = solved || game.guesses.length >= MAX_GUESSES;

  const update = (next: SavedGame) => {
    setGame(next);
    save(day, next);
  };

  const press = (key: string) => {
    if (finished) return;
    setMessage(null);
    if (key === "-") return setCurrent((c) => c.slice(0, -1));
    if (key === "+") {
      if (current.length < WORD_LENGTH) return setMessage("A palavra tem 5 letras.");
      const guesses = [...game.guesses, current];
      const done = current === answer || guesses.length >= MAX_GUESSES;
      update({ guesses, recorded: done });
      setCurrent("");
      // The server re-validates the finished game against today's word.
      if (done) void record({ type: "daily_word_completed", guesses });
      return;
    }
    const letter = normalizeGuess(key);
    if (letter.length === 1) setCurrent((c) => (c.length < WORD_LENGTH ? c + letter : c));
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") press("+");
    else if (e.key === "Backspace") press("-");
    else if (e.key.length === 1) press(e.key);
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Best known state per letter, for the keyboard colors.
  const keyStates = new Map<string, LetterState>();
  const rank: Record<LetterState, number> = { miss: 0, near: 1, hit: 2 };
  for (const guess of game.guesses) {
    evaluateGuess(guess, answer).forEach((state, i) => {
      const prev = keyStates.get(guess[i]);
      if (!prev || rank[state] > rank[prev]) keyStates.set(guess[i], state);
    });
  }

  const share = async () => {
    const text = `${shareText(day, game.guesses, answer, solved)}\n\nJogue em ${window.location.origin}/jogos/palavra-do-dia`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      // share sheet dismissed
    }
  };

  const reference = parseReference(target.reference);
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => game.guesses[i] ?? (i === game.guesses.length ? current : ""));

  return (
    <div className="mx-auto max-w-md space-y-5">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Desafio diário · igual para todos</p>
        <h1 className="font-display text-3xl font-extrabold">Palavra do Dia</h1>
        <p className="mt-1 text-sm text-muted">Descubra a palavra bíblica de 5 letras em até 6 tentativas.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <span className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-semibold text-primary">Dica: {target.hint}</span>
        {(game.guesses.length >= CLUE_AFTER || finished) && (
          <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold-soft px-3 py-1 text-gold">
            <Lightbulb className="size-4" /> {target.clue}
          </span>
        )}
      </div>

      <div className="grid gap-1.5" aria-label="Tentativas">
        {rows.map((row, r) => {
          const states = r < game.guesses.length ? evaluateGuess(row, answer) : null;
          return (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: WORD_LENGTH }, (_, c) => (
                <div
                  key={c}
                  className={clsx(
                    "grid aspect-square place-items-center rounded-xl border-2 font-mono text-2xl font-bold transition",
                    states ? TILE[states[c]] : row[c] ? "border-primary bg-surface text-ink" : "border-line bg-surface/60",
                  )}
                >
                  {row[c] ?? ""}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {message && <p className="text-center text-sm font-semibold text-danger">{message}</p>}

      {finished ? (
        <Card className="animate-rise space-y-3 text-center">
          <p className="font-display text-2xl font-bold">{solved ? `Acertou em ${game.guesses.length}!` : "Não foi dessa vez"}</p>
          <p>
            A palavra era <strong className="font-mono text-primary">{answer}</strong>
            {reference && (
              <>
                {" · "}
                <Link href={chapterHref(reference.book, reference.chapter)} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {target.reference}
                </Link>
              </>
            )}
          </p>
          <p className="text-sm text-muted">Volte amanhã para uma nova palavra.</p>
          <Button onClick={share} className="w-full">
            <Share2 className="size-4" /> {shared ? "Resultado copiado!" : "Compartilhar resultado"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-1.5" aria-label="Teclado">
          {KEYBOARD.map((row) => (
            <div key={row} className="flex justify-center gap-1">
              {row.split("").map((k) => {
                const state = keyStates.get(k);
                const wide = k === "+" || k === "-";
                return (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className={clsx(
                      "grid h-12 place-items-center rounded-lg font-mono text-sm font-bold transition active:scale-95",
                      wide ? "px-3" : "w-8 sm:w-9",
                      state ? TILE[state] : "border border-line bg-surface text-ink",
                    )}
                    aria-label={k === "+" ? "Enviar" : k === "-" ? "Apagar" : k}
                  >
                    {k === "+" ? "ENVIAR" : k === "-" ? <Delete className="size-5" /> : k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
