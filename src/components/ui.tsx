import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "gold";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-strong shadow-card",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  gold: "bg-gold-bright text-[#2a1d05] hover:brightness-105 shadow-card",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-line bg-surface p-5 shadow-card", className)} {...props} />;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{eyebrow}</p>}
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        <div className="gilded-rule mt-1.5" />
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "gold" | "success" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = { primary: "bg-primary", gold: "bg-gold-bright", success: "bg-success" }[tone];
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
