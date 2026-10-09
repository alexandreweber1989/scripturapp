"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Activity } from "@/domain/progression/activities";
import { type Reward, applyActivity } from "@/domain/progression/engine";
import { type ProgressState, createProgressState, normalizeProgressState } from "@/domain/progression/state";
import { dayKey } from "@/domain/time";
import type { ActivityRequest } from "@/lib/activity-request";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export const HIGHLIGHT_COLORS = ["ouro", "oliva", "ceu", "rosa", "lavanda"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface Annotation {
  highlight: HighlightColor | null;
  favorite: boolean;
  note: string | null;
  updatedAt: string;
}

export interface Profile {
  displayName: string;
  companionId: string;
  plan: "free" | "premium";
}

export type Mode = "loading" | "guest" | "account";

/** Requests the client may record. `mentor_question` only exists in guest mode (accounts get it from the server). */
export type ClientActivity = ActivityRequest | { type: "mentor_question"; messageId: string };

interface StoreValue {
  mode: Mode;
  email: string | null;
  profile: Profile;
  progress: ProgressState;
  annotations: Record<string, Annotation>;
  rewards: Reward[];
  record: (activity: ClientActivity) => Promise<Reward | null>;
  annotate: (verse: string, patch: Partial<Omit<Annotation, "updatedAt">>) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "displayName" | "companionId">>) => Promise<void>;
  refreshProgress: () => Promise<void>;
  dismissReward: () => void;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const KEYS = {
  progress: "scriptura:v1:progress",
  claimed: "scriptura:v1:claimed",
  annotations: "scriptura:v1:annotations",
  profile: "scriptura:v1:profile",
};

const DEFAULT_PROFILE: Profile = { displayName: "Peregrino", companionId: "timoteo", plan: "free" };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): progress just won't persist.
  }
}

interface AnnotationRow {
  verse: string;
  highlight: HighlightColor | null;
  favorite: boolean;
  note: string | null;
  updated_at: string;
}

function rowsToAnnotations(rows: AnnotationRow[]): Record<string, Annotation> {
  return Object.fromEntries(
    rows.map((r) => [r.verse, { highlight: r.highlight, favorite: r.favorite, note: r.note, updatedAt: r.updated_at }]),
  );
}

export function ScripturaProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  // Placeholder until mount ("loading" mode); the real day is only known in the browser.
  const [progress, setProgress] = useState<ProgressState>(() => createProgressState(""));
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>({});
  const [rewards, setRewards] = useState<Reward[]>([]);
  const userId = useRef<string | null>(null);
  // Serialises guest-mode writes so two quick taps can't both read stale state.
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const loadGuest = useCallback(() => {
    userId.current = null;
    setEmail(null);
    setProfile({ ...DEFAULT_PROFILE, ...readLocal<Partial<Profile>>(KEYS.profile, {}), plan: "free" });
    setProgress(normalizeProgressState(readLocal(KEYS.progress, null), dayKey()));
    setAnnotations(readLocal(KEYS.annotations, {}));
    setMode("guest");
  }, []);

  const loadAccount = useCallback(async (id: string, accountEmail: string | null) => {
    const supabase = getBrowserSupabase()!;
    userId.current = id;
    setEmail(accountEmail);
    const [progressRes, profileRes, annotationsRes] = await Promise.all([
      fetch("/api/progress", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      supabase.from("profiles").select("display_name, companion_id, plan").eq("id", id).single(),
      supabase.from("verse_annotations").select("verse, highlight, favorite, note, updated_at"),
    ]);
    setProgress(normalizeProgressState(progressRes?.state, dayKey()));
    if (profileRes.data) {
      setProfile({
        displayName: profileRes.data.display_name,
        companionId: profileRes.data.companion_id,
        plan: profileRes.data.plan,
      });
    }
    setAnnotations(rowsToAnnotations((annotationsRes.data as AnnotationRow[] | null) ?? []));
    setMode("account");
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      // localStorage is only readable after mount.
      const timer = setTimeout(loadGuest, 0);
      return () => clearTimeout(timer);
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const user = session?.user;
      // Defer: calling Supabase inside the callback can deadlock the auth lock.
      setTimeout(() => {
        if (user) {
          if (userId.current !== user.id) void loadAccount(user.id, user.email ?? null);
        } else {
          loadGuest();
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadAccount, loadGuest]);

  const pushReward = useCallback((reward: Reward | null) => {
    if (reward && (reward.xp > 0 || reward.achievements.length || reward.levelUp)) {
      setRewards((queue) => [...queue, reward]);
    }
    return reward;
  }, []);

  const record = useCallback(
    async (activity: ClientActivity): Promise<Reward | null> => {
      if (mode === "account") {
        if (activity.type === "mentor_question") return null;
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activity),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { status: string; state: ProgressState; reward?: Reward };
        setProgress(normalizeProgressState(data.state, dayKey()));
        return pushReward(data.reward ?? null);
      }

      // Guest mode: same rules engine, state kept in this browser.
      let resolved: Activity;
      if (activity.type === "quiz_completed") {
        const { resolveActivityRequest } = await import("@/lib/activity-request");
        try {
          resolved = resolveActivityRequest(activity);
        } catch {
          return null;
        }
      } else {
        resolved = activity;
      }
      const claimed = new Set(readLocal<string[]>(KEYS.claimed, []));
      const result = applyActivity(progressRef.current, resolved, { day: dayKey(), alreadyClaimed: (k) => claimed.has(k) });
      if (!result.ok) return null;
      claimed.add(result.key);
      writeLocal(KEYS.claimed, [...claimed]);
      writeLocal(KEYS.progress, result.state);
      progressRef.current = result.state;
      setProgress(result.state);
      return pushReward(result.reward);
    },
    [mode, pushReward],
  );

  const annotate = useCallback(
    async (verse: string, patch: Partial<Omit<Annotation, "updatedAt">>) => {
      const previous = annotations[verse];
      const next: Annotation = {
        highlight: previous?.highlight ?? null,
        favorite: previous?.favorite ?? false,
        note: previous?.note ?? null,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      const isEmpty = !next.highlight && !next.favorite && !next.note;
      const updated = { ...annotations };
      if (isEmpty) delete updated[verse];
      else updated[verse] = next;
      setAnnotations(updated);

      if (mode === "account" && userId.current) {
        const supabase = getBrowserSupabase()!;
        const { error } = isEmpty
          ? await supabase.from("verse_annotations").delete().eq("user_id", userId.current).eq("verse", verse)
          : await supabase.from("verse_annotations").upsert({
              user_id: userId.current,
              verse,
              highlight: next.highlight,
              favorite: next.favorite,
              note: next.note,
            });
        if (error) {
          setAnnotations(annotations);
          return;
        }
      } else {
        writeLocal(KEYS.annotations, updated);
      }

      if (patch.favorite && !previous?.favorite) await record({ type: "verse_favorited", verse });
      if (patch.highlight && !previous?.highlight) await record({ type: "verse_highlighted", verse });
      if (patch.note && patch.note.trim() && patch.note !== previous?.note) await record({ type: "note_written", verse });
    },
    [annotations, mode, record],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "displayName" | "companionId">>) => {
      const next = { ...profile, ...patch };
      setProfile(next);
      if (mode === "account" && userId.current) {
        await getBrowserSupabase()!
          .from("profiles")
          .update({ display_name: next.displayName, companion_id: next.companionId })
          .eq("id", userId.current);
      } else {
        writeLocal(KEYS.profile, { displayName: next.displayName, companionId: next.companionId });
      }
    },
    [mode, profile],
  );

  const refreshProgress = useCallback(async () => {
    if (mode !== "account") return;
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (res.ok) setProgress(normalizeProgressState((await res.json()).state, dayKey()));
  }, [mode]);

  const signOut = useCallback(async () => {
    await getBrowserSupabase()?.auth.signOut();
  }, []);

  const dismissReward = useCallback(() => setRewards((queue) => queue.slice(1)), []);

  const value = useMemo<StoreValue>(
    () => ({ mode, email, profile, progress, annotations, rewards, record, annotate, updateProfile, refreshProgress, dismissReward, signOut }),
    [mode, email, profile, progress, annotations, rewards, record, annotate, updateProfile, refreshProgress, dismissReward, signOut],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useScriptura(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useScriptura must be used inside <ScripturaProvider>");
  return value;
}
