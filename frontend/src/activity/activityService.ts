import { getCurrentUser } from "../auth/authService";
import { getLinkedAccount } from "../leetcode/linkService";
import {
  addDays,
  browserTimeZone,
  dailyStreak,
  dateKey,
  currentWeek,
  weeklyStreak,
  rankStreaks,
  type ActivityDay,
  type DateKey,
  type RankedStreak,
} from "./activity";

// STUB until Matias adds daily solve counts and streaks (#92). Proposed
// contract (rules are in activity.ts):
//   GET /api/dashboard/activity?tz=America/New_York
//   -> {
//        today: "2026-11-18",                       // in the user's timezone
//        days: { date: "2026-11-16", count: 2 }[],  // this week, Mon to Sun,
//                                                   // zero and future days = 0
//        dailyStreak: number,
//        weeklyStreak: number,
//        trackedSince: "2026-10-30" | null          // null = nothing synced
//      }
//   400 if tz isn't a valid IANA timezone, 409 { error: "unlinked" } if no
//   LeetCode account is linked.
// `tz` goes away once the 1-11 timezone setting stores it on the user.

export type ActivityData = {
  // Sent by the server so the browser and the API agree on which day is
  // today, even if the device clock is off.
  today: DateKey;
  days: ActivityDay[];
  dailyStreak: number;
  weeklyStreak: number;
  trackedSince: DateKey | null;
};

// Pick what the stub returns, to check every state of the card:
//   "demo"  a few weeks of made-up history
//   "new"   linked yesterday, one solve so far
//   "empty" linked, nothing synced yet
//   "error" the request fails
const SCENARIO: "demo" | "new" | "empty" | "error" = "demo";

export async function getActivity(): Promise<ActivityData> {
  await new Promise((r) => setTimeout(r, 300)); // feel like a network call
  const timeZone = browserTimeZone();
  const today = dateKey(new Date(), timeZone);

  if (SCENARIO === "error") throw new Error("Couldn't load your activity.");

  let counts = new Map<DateKey, number>();
  let trackedSince: DateKey | null = null;
  if (SCENARIO === "new") {
    trackedSince = addDays(today, -1);
    counts = new Map([[trackedSince, 1]]);
  } else if (SCENARIO === "demo") {
    trackedSince = addDays(today, -40);
    counts = demoHistory(trackedSince, today);
  }

  const active = new Set([...counts].filter(([, n]) => n > 0).map(([d]) => d));
  return {
    today,
    days: currentWeek(counts, today),
    dailyStreak: trackedSince ? dailyStreak(active, today, trackedSince) : 0,
    weeklyStreak: trackedSince ? weeklyStreak(active, today, trackedSince) : 0,
    trackedSince,
  };
}

// Same made-up history every time for a given day: a 4-day run ending
// yesterday (so today shows "not yet"), and scattered solves before that.
function demoHistory(from: DateKey, today: DateKey): Map<DateKey, number> {
  const counts = new Map<DateKey, number>();
  for (let key = from; key < today; key = addDays(key, 1)) {
    const daysAgo = Math.round(
      (Date.parse(today) - Date.parse(key)) / 86_400_000,
    );
    if (daysAgo <= 4) counts.set(key, [0, 2, 1, 4, 1][daysAgo]);
    else if (daysAgo !== 5)
      counts.set(key, (daysAgo * 7) % 5 === 0 ? 0 : (daysAgo % 3) + 1);
  }
  return counts;
}

// ---- Friends' streaks (Friends tab of the Activity card) -------------------

// STUB until following exists (#93 Friends) and Matias adds this. Proposed:
//   GET /api/friends/streaks
//   -> {
//        top: RankedStreak[],     // you + everyone you follow, ranked by
//                                 // day streak (rules in rankStreaks), top 4
//        you: RankedStreak,
//        followingCount: number   // 0 = show the "follow people" message
//      }
// Each streak uses the same rules as your own (activity.ts), in each
// person's own timezone.
export type StreakBoard = {
  top: RankedStreak[];
  you: RankedStreak;
  followingCount: number;
};

// "demo" = a few made-up friends (two tied with you), "none" = you follow
// nobody yet, "error" = the request fails.
const FRIENDS_SCENARIO: "demo" | "none" | "error" = "demo";

const DEMO_FRIENDS = [
  { userId: "demo-1", username: "maria_codes", streak: 12 },
  { userId: "demo-2", username: "dp_dan", streak: 7 },
  { userId: "demo-3", username: "graphgal", streak: 4 },
  { userId: "demo-4", username: "two_pointer_tom", streak: 1 },
  { userId: "demo-5", username: "binary_bea", streak: 0 },
];

export async function getFriendStreaks(): Promise<StreakBoard> {
  if (FRIENDS_SCENARIO === "error") {
    await new Promise((r) => setTimeout(r, 300));
    throw new Error("Couldn't load your friends' streaks.");
  }
  // Your own row: your real id (so it gets highlighted), your LeetCode name
  // and your streak from the activity stub.
  const [activity, account] = await Promise.all([
    getActivity(),
    getLinkedAccount().catch(() => null),
  ]);
  const me = {
    userId: getCurrentUser()?.id ?? "me",
    username: account?.username ?? "you",
    streak: activity.dailyStreak,
  };
  const friends = FRIENDS_SCENARIO === "demo" ? DEMO_FRIENDS : [];
  const ranked = rankStreaks([me, ...friends]);
  return {
    top: ranked.slice(0, 4),
    you: ranked.find((p) => p.userId === me.userId)!,
    followingCount: friends.length,
  };
}
