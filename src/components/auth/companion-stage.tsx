"use client";

import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { COMPANIONS, companionSprite } from "@/domain/companions";

/** How the sign-in form feels right now; the companions react to it. */
export type StageMood = "idle" | "typing" | "password" | "error" | "success";
type Pose = "idle" | "wave" | "cheer" | "hide";
type Action = "" | "hop" | "spin" | "wiggle" | "walk" | "shake";

const POSES: Pose[] = ["idle", "wave", "cheer", "hide"];

/** Short lines for the stage; longer encouragement lives in companions.json. */
const LINES: Record<string, string[]> = {
  timoteo: ["Vamos estudar juntos? 📖", "Ninguém te despreze por ser jovem! 💪"],
  ester: ["Para um momento como este! 👑", "Coragem e fé! 💜"],
  davi: ["Com Deus eu enfrento gigantes! 🪨", "O Senhor é meu pastor 🎶"],
  moises: ["Toda jornada começa com um passo 🌊", "Siga em frente! 🏔️"],
  noe: ["Bem-vindo a bordo! 🌈", "Depois da chuva vem o arco-íris ☀️"],
};

interface Actor {
  /** Waving overrides the pose the mood asks for. */
  wave: boolean;
  action: Action;
  /** Bumped to restart the same CSS animation. */
  tick: number;
  offset: number;
  flip: boolean;
  bubble: string | null;
}

const HOME = [11, 30.5, 50, 69.5, 89];
const MOOD_POSE: Record<StageMood, Pose> = { idle: "idle", typing: "idle", password: "hide", error: "idle", success: "cheer" };
/** Who answers each mood, and what they say. */
const MOOD_LINE: Partial<Record<StageMood, { speaker: number; text: string }>> = {
  password: { speaker: 3, text: "🙈 Não estou olhando!" },
  error: { speaker: 1, text: "Ops! Tenta de novo 😅" },
  success: { speaker: 2, text: "Bem-vindo! 🎉" },
};
/** Keystrokes take turns around the cast in this order. */
const HOP_ORDER = [2, 0, 4, 1, 3];

/** The latest keystroke that was this actor's turn to hop (0 = none yet). */
function lastHop(i: number, pulse: number) {
  for (let p = pulse; p >= Math.max(1, pulse - HOP_ORDER.length + 1); p--) if (HOP_ORDER[p % HOP_ORDER.length] === i) return p;
  return 0;
}
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const anyone = () => Math.floor(Math.random() * COMPANIONS.length);

function poseSrc(id: string, pose: Pose) {
  return pose === "idle" ? companionSprite(COMPANIONS.find((c) => c.id === id)!) : `/companions/poses/${id}-${pose}.webp`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * The five companions standing on a little stage: they idle around, hop while
 * you type, cover their eyes on the password field, shake on errors and party
 * on success. Purely decorative: hidden from assistive tech and out of the tab
 * order, but they still answer to a tap.
 */
export function CompanionStage({ mood, pulse, compact = false, className }: { mood: StageMood; pulse: number; compact?: boolean; className?: string }) {
  const [actors, setActors] = useState<Actor[]>(() => COMPANIONS.map(() => ({ wave: false, action: "", tick: 0, offset: 0, flip: false, bubble: null })));
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const reduced = usePrefersReducedMotion();

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const patch = useCallback((i: number, change: Partial<Actor> | ((a: Actor) => Partial<Actor>)) => {
    setActors((list) => list.map((a, j) => (j === i ? { ...a, ...(typeof change === "function" ? change(a) : change), tick: a.tick + 1 } : a)));
  }, []);

  // One speaker at a time: a new line replaces any bubble still on screen.
  const say = useCallback(
    (i: number, text: string, ms = 2200) => {
      setActors((list) => list.map((a, j) => ({ ...a, bubble: j === i ? text : null })));
      later(() => setActors((list) => list.map((a, j) => (j === i && a.bubble === text ? { ...a, bubble: null } : a))), ms);
    },
    [later],
  );

  // A little personality while nobody is typing (skipped while the stage is hidden).
  useEffect(() => {
    if (mood !== "idle" || reduced) return;
    const loop = window.setInterval(() => {
      if (!stageRef.current?.offsetParent) return;
      const i = anyone();
      const move = pick(["hop", "wave", "spin", "walk", "say", "wiggle", "hop"] as const);
      if (move === "wave" || move === "say") {
        patch(i, { wave: true, action: "wiggle" });
        if (move === "say") say(i, pick(LINES[COMPANIONS[i].id]));
        later(() => patch(i, { wave: false, action: "" }), 1500);
      } else if (move === "walk") {
        patch(i, (a) => {
          const next = Math.max(8 - HOME[i], Math.min(92 - HOME[i], Math.max(-7, Math.min(7, a.offset + (Math.random() < 0.5 ? -6 : 6)))));
          return { action: "walk", offset: next, flip: next < a.offset };
        });
        later(() => patch(i, { action: "" }), 1200);
      } else {
        patch(i, { action: move });
        later(() => patch(i, { action: "" }), 800);
      }
    }, 1400);
    return () => clearInterval(loop);
  }, [mood, reduced, patch, say, later]);

  const poke = (i: number) => {
    if (mood === "success") return;
    const c = COMPANIONS[i];
    patch(i, { wave: true, action: reduced ? "" : "hop" });
    say(i, `${c.name}: ${pick(LINES[c.id])}`);
    later(() => patch(i, { wave: false, action: "" }), 1400);
  };

  // The form's mood is drawn straight from props: poses, the line that answers
  // it (faded out by CSS) and a hop on each keystroke.
  const moodLine = actors.some((a) => a.bubble) ? undefined : MOOD_LINE[mood];
  const typing = mood === "typing" && !reduced;

  return (
    <div ref={stageRef} className={clsx("stage", compact && "stage-compact", `stage-${mood}`, className)} aria-hidden>
      <div className="stage-ground" />
      {mood === "success" && !reduced && (
        <div className="stage-confetti">
          {Array.from({ length: 22 }, (_, k) => (
            <span key={k} style={{ "--k": k } as React.CSSProperties} />
          ))}
        </div>
      )}
      {COMPANIONS.map((c, i) => {
        const a = actors[i];
        const pose = a.wave ? "wave" : MOOD_POSE[mood];
        const hop = typing ? lastHop(i, pulse) : 0;
        const action = a.action || (hop ? "hop" : "");
        const bubble = a.bubble ?? (moodLine?.speaker === i ? moodLine.text : null);
        return (
          <button
            type="button"
            tabIndex={-1}
            key={c.id}
            onClick={() => poke(i)}
            className={clsx("stage-actor", a.flip && "stage-flip")}
            style={{ left: `${HOME[i] + (mood === "success" ? 0 : a.offset)}%`, "--i": i } as React.CSSProperties}
          >
            {bubble && (
              <span
                key={bubble}
                className={clsx(
                  "stage-bubble",
                  !a.bubble && "stage-mood-bubble",
                  i === 0 && "stage-bubble-start",
                  i === COMPANIONS.length - 1 && "stage-bubble-end",
                )}
              >
                {bubble}
              </span>
            )}
            <span key={`${a.action}-${a.tick}-${hop}`} className={clsx("stage-body", action && `stage-${action}`)}>
              {POSES.map((p) => (
                <Image
                  key={p}
                  src={poseSrc(c.id, p)}
                  alt=""
                  width={256}
                  height={256}
                  draggable={false}
                  unoptimized
                  className={clsx("stage-sprite", pose === p && "stage-on")}
                />
              ))}
            </span>
            <span key={`s-${a.action}-${a.tick}-${hop}`} className={clsx("stage-shadow", action && `stage-shadow-${action}`)} />
          </button>
        );
      })}
    </div>
  );
}
