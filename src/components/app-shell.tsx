"use client";

import clsx from "clsx";
import { BookOpen, Flame, Gamepad2, House, MessageCircle, Route, User } from "lucide-react";
import Image from "next/image";
import Link from "@/components/transition-link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { levelFromXp } from "@/domain/progression/levels";
import { effectiveStreak } from "@/domain/progression/streak";
import { dayKey } from "@/domain/time";
import { BRAND_MARK } from "@/lib/assets";
import { useScriptura } from "@/lib/client/store";
import { RewardToast } from "./reward-toast";
import { ThemeToggleButton } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/biblia", label: "Bíblia", icon: BookOpen },
  { href: "/trilhas", label: "Trilhas", icon: Route },
  { href: "/jogos", label: "Jogos", icon: Gamepad2 },
  { href: "/mentor", label: "Mentor", icon: MessageCircle },
  { href: "/perfil", label: "Perfil", icon: User },
];
/** The bottom bar fits five items; Perfil moves to the header on mobile. */
const MOBILE_NAV = NAV.filter((item) => item.href !== "/perfil");

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Scriptura — início">
      <Image src={BRAND_MARK} alt="" width={40} height={40} className="glow-primary size-10 rounded-xl" priority />
      <span className="hidden font-display text-xl font-extrabold tracking-tight min-[420px]:inline md:inline">Scriptura</span>
    </Link>
  );
}

function StatusChips() {
  const { progress, mode } = useScriptura();
  if (mode === "loading") return null;
  const streak = effectiveStreak(progress.streak, dayKey());
  const activeToday = progress.streak.lastActiveDay === dayKey();
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap tabular-nums text-sm font-medium">
      <span
        className={clsx("flex h-9 items-center gap-1 rounded-full px-3", activeToday ? "border-flame/30 bg-flame/10 text-flame" : "border-line bg-surface-2 text-muted", "border")}
        title={activeToday ? "Sequência mantida hoje" : "Estude hoje para manter a sequência"}
      >
        <Flame className="size-4" aria-hidden />
        {streak}
      </span>
      <span className="bg-gradient-primary flex h-9 items-center rounded-full px-3 font-bold text-white" title={`${progress.xp} XP`}>
        LV {levelFromXp(progress.xp)}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = /^\/biblia\/[^/]+\/\d+/.test(pathname);
  const sideIndex = NAV.findIndex((item) => isActive(pathname, item.href));
  const tabIndex = MOBILE_NAV.findIndex((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <div className="app-backdrop" aria-hidden />
      <aside className="glass sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line px-4 py-6 md:flex" style={{ viewTransitionName: "site-sidebar" }}>
        <Logo />
        <nav className="relative flex flex-col gap-1" aria-label="Principal">
          {/* One highlight that glides to the active item (the shell persists across navigations). */}
          <span
            aria-hidden
            className={clsx(
              "bg-gradient-primary glow-primary absolute inset-x-0 top-0 h-11 rounded-xl transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none",
              sideIndex < 0 && "opacity-0",
            )}
            style={{ translate: `0 ${Math.max(sideIndex, 0) * 48}px` }}
          />
          {NAV.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              aria-current={i === sideIndex ? "page" : undefined}
              className={clsx(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-300",
                i === sideIndex ? "font-bold text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header
          className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 md:px-8"
          style={{ viewTransitionName: "site-header" }}
        >
          <div className="md:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <StatusChips />
            <ThemeToggleButton />
            <Link
              href="/perfil"
              className={clsx(
                "grid size-10 place-items-center rounded-full border md:hidden",
                isActive(pathname, "/perfil") ? "bg-gradient-primary border-transparent text-white" : "border-line bg-surface-2 text-muted",
              )}
              aria-label="Perfil"
            >
              <User className="size-4" />
            </Link>
          </div>
        </header>

        <main className={clsx("mx-auto w-full flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12", immersive ? "max-w-3xl" : "max-w-5xl")}>{children}</main>
      </div>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ viewTransitionName: "site-tabbar" }}
        aria-label="Principal"
      >
        <span
          aria-hidden
          className={clsx(
            "bg-gradient-primary glow-primary absolute top-2 h-7 w-12 -translate-x-1/2 rounded-full transition-[left,opacity] duration-500 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none",
            tabIndex < 0 && "opacity-0",
          )}
          style={{ left: `${(Math.max(tabIndex, 0) + 0.5) * (100 / MOBILE_NAV.length)}%` }}
        />
        {MOBILE_NAV.map(({ href, label, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={i === tabIndex ? "page" : undefined}
            className={clsx(
              "relative flex min-h-14 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] font-semibold transition-colors duration-300",
              i === tabIndex ? "text-primary" : "text-muted",
            )}
          >
            <span className={clsx("grid h-7 w-12 place-items-center transition-colors duration-300", i === tabIndex && "text-white")}>
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
