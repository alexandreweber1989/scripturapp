"use client";

import clsx from "clsx";
import { Shield, Sparkles, Trophy, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { getCompanion } from "@/domain/companions";
import type { Reward } from "@/domain/progression/engine";
import { levelTitle, rankForLevel } from "@/domain/progression/levels";
import { getTrail } from "@/domain/trails";
import { relicImage } from "@/lib/assets";
import { useScriptura } from "@/lib/client/store";
import { CompanionAvatar } from "./companion-avatar";
import { Button } from "./ui";

/** Milestones get a full-screen celebration with the companion; everything else a toast. */
function isMilestone(reward: Reward) {
  return reward.relics.length > 0 || reward.levelUp !== null || reward.perfectQuiz;
}

export function RewardToast() {
  const { rewards } = useScriptura();
  const reward = rewards[0];
  if (!reward) return null;
  // Keyed so each reward gets fresh timers and animations.
  return isMilestone(reward) ? <Celebration key={rewards.length} reward={reward} /> : <Toast key={rewards.length} reward={reward} />;
}

function Toast({ reward }: { reward: Reward }) {
  const { dismissReward } = useScriptura();
  const big = reward.achievements.length > 0 || reward.fullDay;

  useEffect(() => {
    const timer = setTimeout(dismissReward, big ? 6000 : 3200);
    return () => clearTimeout(timer);
  }, [big, dismissReward]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 md:top-auto md:bottom-8 md:pl-60" aria-live="polite">
      <div className="animate-rise pointer-events-auto w-full max-w-sm rounded-2xl glass gradient-border p-4 shadow-card" role="status">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
            {reward.achievements.length ? <Trophy className="size-6" /> : <span className="font-mono font-bold">+{reward.xp}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">+{reward.xp} XP</p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted">
              {reward.lines.slice(0, 4).map((line, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{line.label}</span>
                  {line.xp > 0 && <span className="font-mono font-medium text-gold">+{line.xp}</span>}
                </li>
              ))}
            </ul>
            {reward.streak.shieldEarned && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                <Shield className="size-4" /> Você ganhou um Escudo da Fé!
              </p>
            )}
          </div>
          <button onClick={dismissReward} className="-m-1.5 grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => i);

function Celebration({ reward }: { reward: Reward }) {
  const { dismissReward, profile } = useScriptura();
  const companion = getCompanion(profile.companionId);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const relic = reward.relics.length ? getTrail(reward.relics[0]) : undefined;

  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissReward();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissReward]);

  const view = relic
    ? {
        eyebrow: "Trilha dominada",
        title: relic.relic,
        subtitle: "Nova relíquia na sua coleção",
        speech: "Uma relíquia para a sua coleção! Guarde bem esse tesouro. 💎",
      }
    : reward.levelUp
      ? {
          eyebrow: `Novo nível · ${rankForLevel(reward.levelUp.to).name}`,
          title: `Nível ${reward.levelUp.to}`,
          subtitle: levelTitle(reward.levelUp.to),
          speech: "Você subiu de nível! Sua dedicação está dando frutos. 🌱",
        }
      : {
          eyebrow: "Quiz do capítulo",
          title: "3/3",
          subtitle: "Gabarito! Etapa vencida",
          speech: "Nenhum erro! Você leu com atenção e com o coração. ✨",
        };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-bg/70 p-4 backdrop-blur-sm" onClick={dismissReward}>
      <div className="celebration-rays pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-[58%]" aria-hidden />
      <div className="confetti pointer-events-none absolute inset-0" aria-hidden>
        {CONFETTI.map((i) => (
          <span key={i} style={{ left: `${i * 5.5 + 1}%`, background: `hsl(${230 + i * 37} 80% 62%)`, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop glass relative flex w-full max-w-sm flex-col items-center gap-2 rounded-3xl border border-gold-bright/40 px-5 pb-5 pt-8 text-center shadow-card glow-gold"
      >
        {relic ? (
          <Image src={relicImage(relic.id)} alt="" width={128} height={128} className="glow-gold animate-float size-32 rounded-2xl object-cover" />
        ) : (
          <span className="bg-gradient-gold glow-gold grid size-14 place-items-center rounded-2xl text-[#2a1d05]">
            <Sparkles className="size-6" />
          </span>
        )}
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{view.eyebrow}</p>
        <h2
          id="celebration-title"
          className={clsx(
            "text-gradient-gold font-display font-extrabold leading-none tracking-tight",
            relic ? "text-3xl leading-tight" : "text-6xl",
          )}
        >
          {view.title}
        </h2>
        <p className="font-bold">{view.subtitle}</p>

        <ul className="mt-3 w-full space-y-1 text-sm">
          {reward.lines
            .filter((l) => l.xp > 0)
            .slice(0, 4)
            .map((line, i) => (
              <li key={i} className="animate-rise flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2" style={{ animationDelay: `${300 + i * 120}ms` }}>
                <span className="min-w-0 truncate text-left">{line.label}</span>
                <strong className="font-mono text-gold">+{line.xp}</strong>
              </li>
            ))}
          <li className="animate-rise flex justify-between rounded-xl bg-gold-soft px-3 py-2 font-extrabold" style={{ animationDelay: "800ms" }}>
            <span>Total</span>
            <strong className="font-mono text-gold">+{reward.xp} XP</strong>
          </li>
        </ul>

        <div className="mt-2 flex w-full items-end gap-2 text-left">
          <CompanionAvatar id={companion.id} size={72} className="animate-hop shrink-0" />
          <p className="glass mb-3 flex-1 rounded-2xl rounded-bl-sm border border-line px-3 py-2 text-sm">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-violet">{companion.name}</span>
            {view.speech}
          </p>
        </div>

        {reward.streak.shieldEarned && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Shield className="size-4" /> Você ganhou um Escudo da Fé!
          </p>
        )}

        <Button ref={buttonRef} onClick={dismissReward} className="mt-2 min-h-12 w-full">
          Continuar
        </Button>
      </div>
    </div>
  );
}
