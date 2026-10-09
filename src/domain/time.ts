/**
 * Day boundaries for streaks, daily quests and daily caps.
 *
 * Client and server must agree on what "today" is, so the day key is always
 * computed in the platform time zone rather than the runtime's local zone.
 */
export const PLATFORM_TIME_ZONE = "America/Sao_Paulo";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PLATFORM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` for the given instant, in the platform time zone. */
export function dayKey(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`). Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Day of the year (1-366) for a `YYYY-MM-DD` key. */
export function dayOfYear(key: string): number {
  return daysBetween(`${key.slice(0, 4)}-01-01`, key) + 1;
}
