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
import { ThemeToggleButton } from "./theme-toggle";

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
      <span className="bg-gradient-primary glow-primary grid size-9 place-items-center rounded-xl font-display text-lg font-extrabold text-white">S</span>
      <span className="font-display text-xl font-extrabold tracking-tight">
        Scriptura<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

function StatusChips() {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return null;
  const streak = effectiveStreak(progress.streak, dayKey());
  const activeToday = progress.streak.lastActiveDay === dayKey();
  return (
    <div className="flex items-center gap-2 font-mono text-sm font-medium">
      <span
        className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1", activeToday ? "border-flame/30 bg-flame/10 text-flame" : "border-line bg-surface-2 text-muted", "border")}
        title={activeToday ? "Sequência mantida hoje" : "Estude hoje para manter a sequência"}
      >
        <Flame className="size-4" aria-hidden />
        {streak}
      </span>
      <span className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-primary" title={`${progress.xp} XP`}>
        LV {levelFromXp(progress.xp)}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = /^\/biblia\/[^/]+\/\d+/.test(pathname);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <div className="app-backdrop" aria-hidden />
      <aside className="glass sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line px-4 py-6 md:flex">
        <Logo />
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(pathname, href) ? "bg-gradient-primary glow-primary font-bold text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 md:px-8">
          <div className="md:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <StatusChips />
            <ThemeToggleButton />
          </div>
        </header>

        <main className={clsx("mx-auto w-full flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12", immersive ? "max-w-3xl" : "max-w-5xl")}>{children}</main>
      </div>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive(pathname, href) ? "text-primary" : "text-muted")}
          >
            <span className={clsx("grid h-7 w-12 place-items-center rounded-full transition", isActive(pathname, href) && "bg-gradient-primary text-white glow-primary")}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <RewardToast />
    </div>
  );
}
