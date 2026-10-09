"use client";

import clsx from "clsx";
import { BookOpen, Flame, Gamepad2, House, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { levelFromXp } from "@/domain/progression/levels";
import { effectiveStreak } from "@/domain/progression/streak";
import { dayKey } from "@/domain/time";
import { useScriptura } from "@/lib/client/store";
import { RewardToast } from "./reward-toast";

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/biblia", label: "Bíblia", icon: BookOpen },
  { href: "/jogos", label: "Jogos", icon: Gamepad2 },
  { href: "/mentor", label: "Mentor", icon: MessageCircle },
  { href: "/perfil", label: "Perfil", icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Scriptura — início">
      <span className="grid size-8 place-items-center rounded-lg bg-primary font-serif text-lg font-bold text-gold-bright shadow-card">S</span>
      <span className="font-serif text-xl font-semibold tracking-tight">Scriptura</span>
    </Link>
  );
}

function StatusChips() {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return null;
  const streak = effectiveStreak(progress.streak, dayKey());
  const activeToday = progress.streak.lastActiveDay === dayKey();
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span
        className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1", activeToday ? "bg-flame/15 text-flame" : "bg-surface-2 text-muted")}
        title={activeToday ? "Sequência mantida hoje" : "Estude hoje para manter a sequência"}
      >
        <Flame className="size-4" aria-hidden />
        {streak}
      </span>
      <span className="rounded-full bg-gold-soft px-2.5 py-1 text-gold" title={`${progress.xp} XP`}>
        Nv {levelFromXp(progress.xp)}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = /^\/biblia\/[^/]+\/\d+/.test(pathname);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-surface px-4 py-6 md:flex">
        <Logo />
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(pathname, href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="md:invisible">
            <Logo />
          </div>
          <StatusChips />
        </header>

        <main className={clsx("mx-auto w-full flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12", immersive ? "max-w-3xl" : "max-w-5xl")}>{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", isActive(pathname, href) ? "text-primary" : "text-muted")}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <RewardToast />
    </div>
  );
}
