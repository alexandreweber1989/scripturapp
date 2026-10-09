"use client";

import { Shield, Sparkles, Trophy, X } from "lucide-react";
import { useEffect } from "react";
import { levelTitle } from "@/domain/progression/levels";
import { useScriptura } from "@/lib/client/store";

/** Celebrates XP, quests, achievements and level-ups, one reward at a time. */
export function RewardToast() {
  const { rewards, dismissReward } = useScriptura();
  const reward = rewards[0];
  const big = !!reward && (reward.levelUp !== null || reward.achievements.length > 0 || reward.fullDay);

  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(dismissReward, big ? 6000 : 3200);
    return () => clearTimeout(timer);
  }, [reward, big, dismissReward]);

  if (!reward) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 md:top-auto md:bottom-8 md:pl-60" aria-live="polite">
      <div
        key={rewards.length}
        className="animate-rise pointer-events-auto w-full max-w-sm rounded-2xl border border-gold/40 bg-surface p-4 shadow-card"
        role="status"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
            {reward.levelUp ? <Sparkles className="size-6" /> : reward.achievements.length ? <Trophy className="size-6" /> : <span className="font-bold">+{reward.xp}</span>}
          </div>
          <div className="min-w-0 flex-1">
            {reward.levelUp ? (
              <>
                <p className="font-serif text-lg font-semibold">Nível {reward.levelUp.to}!</p>
                <p className="text-sm text-muted">{levelTitle(reward.levelUp.to)}</p>
              </>
            ) : (
              <p className="font-semibold">+{reward.xp} XP</p>
            )}
            <ul className="mt-1 space-y-0.5 text-sm text-muted">
              {reward.lines.slice(0, 4).map((line, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">{line.label}</span>
                  {line.xp > 0 && <span className="font-medium text-gold">+{line.xp}</span>}
                </li>
              ))}
            </ul>
            {reward.streak.shieldEarned && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                <Shield className="size-4" /> Você ganhou um Escudo da Fé!
              </p>
            )}
          </div>
          <button onClick={dismissReward} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
