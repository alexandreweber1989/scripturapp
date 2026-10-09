"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-boot";

export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const STORAGE_KEY = THEME_STORAGE_KEY;
const CHANGE_EVENT = "scriptura:theme";

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function resolve(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return systemQuery().matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice still applies to this visit.
  }
  apply(resolve(preference));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  // In "Automático" mode, follow the system switching between light and dark.
  const onSystemChange = () => {
    if (readPreference() === "system") {
      apply(resolve("system"));
      callback();
    }
  };
  const query = systemQuery();
  query.addEventListener("change", onSystemChange);
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    query.removeEventListener("change", onSystemChange);
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** The saved preference and the theme actually shown. `null` during prerender. */
export function useTheme(): { preference: ThemePreference; theme: Theme } | null {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${readPreference()}|${document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"}`,
    () => null,
  );
  if (!snapshot) return null;
  const [preference, theme] = snapshot.split("|") as [ThemePreference, Theme];
  return { preference, theme };
}
