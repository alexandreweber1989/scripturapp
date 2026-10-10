import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "gold";

const variants: Record<Variant, string> = {
  primary: "bg-gradient-primary text-white glow-primary hover:brightness-110",
  secondary: "glass text-ink border border-line hover:border-primary/40",
  ghost: "text-ink hover:bg-surface-2",
  gold: "bg-gradient-gold text-[#2a1d05] shadow-card hover:brightness-105",
};

const base =
  "sheen inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export function Card({ className, interactive = false, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={clsx("glass rounded-2xl border border-line p-5 shadow-card", interactive && "premium-lift", className)} {...props} />;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="tabular-nums text-[11px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <div className="gradient-rule mt-1.5" />
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "gold" | "success" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = { primary: "bg-gradient-primary", gold: "bg-gradient-gold", success: "bg-gradient-accent" }[tone];
  return (
    <div
      className={clsx("h-2 overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={clsx("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-surface-2", className)} />;
}
