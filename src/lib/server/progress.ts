import "server-only";
import type { Activity } from "@/domain/progression/activities";
import { type Reward, applyActivity } from "@/domain/progression/engine";
import { type ProgressState, normalizeProgressState } from "@/domain/progression/state";
import { dayKey } from "@/domain/time";
import { getAdminSupabase } from "@/lib/supabase/server";

interface StoredProgress {
  state: ProgressState;
  version: number;
}

export async function loadProgress(userId: string): Promise<StoredProgress> {
  const { data, error } = await getAdminSupabase()
    .from("user_progress")
    .select("state, version")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { state: normalizeProgressState(data?.state, dayKey()), version: data?.version ?? 0 };
}

export type RecordResult =
  | { status: "ok"; state: ProgressState; reward: Reward }
  | { status: "duplicate" | "invalid"; state: ProgressState };

const MAX_ATTEMPTS = 3;

/**
 * Applies an activity with the shared rules engine and persists the result
 * atomically. Duplicates are caught by the ledger's unique key; concurrent
 * writes by the version check (we reload and retry).
 */
export async function recordActivity(userId: string, activity: Activity): Promise<RecordResult> {
  const admin = getAdminSupabase();
  for (let attempt = 1; ; attempt++) {
    const { state, version } = await loadProgress(userId);
    const result = applyActivity(state, activity, { day: dayKey(), alreadyClaimed: () => false });
    if (!result.ok) return { status: result.reason, state };

    const { data, error } = await admin.rpc("commit_progress", {
      p_user_id: userId,
      p_expected_version: version,
      p_state: result.state,
      p_xp: result.state.xp,
      p_event_key: result.key,
      p_event_type: activity.type,
      p_event_xp: result.reward.xp,
      p_payload: activity,
    });

    if (error) {
      if (error.code === "40001" && attempt < MAX_ATTEMPTS) continue;
      throw error;
    }
    if (data === "duplicate") return { status: "duplicate", state };
    return { status: "ok", state: result.state, reward: result.reward };
  }
}
