"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { type ThemePreference, setThemePreference, useTheme } from "@/lib/client/theme";

/** Header button: flips between light and dark. */
export function ThemeToggleButton() {
  const state = useTheme();
  const dark = state?.theme === "dark";
  return (
    <button
      onClick={() => setThemePreference(dark ? "light" : "dark")}
      className="grid size-8 place-items-center rounded-full border border-line bg-surface-2 text-muted transition hover:text-primary"
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      {/* The icon depends on the applied theme, known only in the browser. */}
      {state && (dark ? <Sun className="size-4" /> : <Moon className="size-4" />)}
    </button>
  );
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

/** Profile setting: light, dark or follow the device. */
export function ThemeSelector() {
  const state = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-surface-2 p-1.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = state?.preference === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setThemePreference(value)}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active ? "bg-gradient-primary glow-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
