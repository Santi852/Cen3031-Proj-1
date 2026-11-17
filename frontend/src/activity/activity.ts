// Activity strip and streak rules (#92). Written down here so the UI, the stub
// and Matias's API agree:
// - The strip shows the current week, Monday to Sunday, so each square stays
//   in the same spot all week. Days after today are "upcoming", not inactive.
// - Days are calendar days in the user's timezone (the browser's for now,
//   the 1-11 setting once Hussain adds it). Solves are stored in UTC; only the
//   bucketing is local.
// - A day is active if at least one problem was solved for the first time
//   that day (deduplicated solves, so re-syncing never adds activity).
// - Daily streak: active days in a row, ending today. Today doesn't break the
//   streak until it's over: with no solve yet today, the streak counts up to
//   yesterday.
// - Weeks run Monday to Sunday, local time. A week is active if it has at
//   least one active day. Weekly streak works the same as the daily one, with
//   the current week not breaking it until it's over.
// - History only goes back to `trackedSince` (when we started seeing your
//   solves). Days before it are "unknown", never shown as inactive, and a
//   streak can't reach back past it.

// "YYYY-MM-DD", a calendar day with no time or timezone attached.
export type DateKey = string;

export type ActivityDay = { date: DateKey; count: number };

// The browser's timezone, e.g. "America/New_York". Sent to the API so it can
// bucket solves into the same days the user sees.
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// The calendar day `instant` falls on in `timeZone`. en-CA formats dates as
// YYYY-MM-DD, which is exactly the key format.
export function dateKey(instant: Date, timeZone?: string): DateKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

// Day math on keys. Done in UTC so daylight saving never makes a day 23 or 25
// hours long and skips or repeats a date.
function toUtc(key: DateKey): Date {
  return new Date(`${key}T00:00:00Z`);
}
export function addDays(key: DateKey, days: number): DateKey {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The Monday that starts `key`'s week.
export function weekOf(key: DateKey): DateKey {
  const weekday = toUtc(key).getUTCDay(); // 0 = Sunday
  return addDays(key, -((weekday + 6) % 7));
}

// Monday to Sunday of today's week, with zero-count days filled in.
export function currentWeek(
  counts: ReadonlyMap<DateKey, number>,
  today: DateKey,
): ActivityDay[] {
  const monday = weekOf(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, count: counts.get(date) ?? 0 };
  });
}

// Counts back from `current` while `isActive` holds. If `current` itself isn't
// active yet it's still in progress, so start from the one before it.
function streak(
  current: DateKey,
  step: (key: DateKey) => DateKey,
  isActive: (key: DateKey) => boolean,
  trackedSince: DateKey,
): number {
  let key = isActive(current) ? current : step(current);
  let length = 0;
  // Keys compare correctly as strings because they're zero-padded.
  while (key >= trackedSince && isActive(key)) {
    length++;
    key = step(key);
  }
  return length;
}

export function dailyStreak(
  activeDays: ReadonlySet<DateKey>,
  today: DateKey,
  trackedSince: DateKey,
): number {
  return streak(
    today,
    (k) => addDays(k, -1),
    (k) => activeDays.has(k),
    trackedSince,
  );
}

export function weeklyStreak(
  activeDays: ReadonlySet<DateKey>,
  today: DateKey,
  trackedSince: DateKey,
): number {
  const activeWeeks = new Set([...activeDays].map(weekOf));
  return streak(
    weekOf(today),
    (k) => addDays(k, -7),
    (k) => activeWeeks.has(k),
    // A partly tracked week still counts if it had a solve.
    weekOf(trackedSince),
  );
}

// ---- Friends' streaks ------------------------------------------------------

export type StreakPlayer = { userId: string; username: string; streak: number };
export type RankedStreak = StreakPlayer & { rank: number };

// Longest day streak first. Same tie rule as the leaderboard: equal streaks
// share a rank and the next rank skips (4, 4, 2 -> 1st, 1st, 3rd), so
// everyone at 0 is tied too. Ties are listed by name so the order is stable.
export function rankStreaks(players: StreakPlayer[]): RankedStreak[] {
  const sorted = [...players].sort(
    (a, b) => b.streak - a.streak || a.username.localeCompare(b.username),
  );
  return sorted.map((player, i) => {
    let first = i;
    while (first > 0 && sorted[first - 1].streak === player.streak) first--;
    return { ...player, rank: first + 1 };
  });
}
