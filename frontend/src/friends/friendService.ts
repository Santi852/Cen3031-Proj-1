import type { User } from "../auth/authService";
import type { Badge } from "../badge/badge";
import {
  getLeaderboard,
  type Leaderboard,
  type LeaderboardEntry,
} from "../leetcode/leaderboardService";

// Friends (#93). Following is one-way and needs no approval, like most
// fitness and coding apps: weekly points are already public on the global
// leaderboard, so following someone shows you nothing new about them, it
// just puts them on your boards.
//
// STUB until Matias builds it. Proposed contract:
//   GET    /api/friends             -> Friend[]  (people you follow, A-Z)
//   GET    /api/friends/followers   -> Friend[]  (people who follow you, A-Z)
//   POST   /api/friends             <- { username }  -> Friend
//                                     404 not_found: no StackSprint player
//                                         has that LeetCode username
//                                     400 self, 409 already_following
//   DELETE /api/friends/:userId     -> 204 (not following = 204 too)
//   GET    /leaderboard?period=week&scope=friends
//                                   -> Leaderboard, same shape as the global
//                                      board, ranked among you + who you follow
//   GET    /api/friends/streaks     (see activityService.ts)
// `username` is the linked LeetCode username, the name shown on every board.
//
// Until then who you follow lives in this browser's localStorage, keyed by
// your user id. The people you can follow are a few demo players plus whoever
// is on the real weekly board. Every function is async so swapping in
// apiFetch() later won't change any caller.

export type Friend = {
  userId: string;
  username: string;
  badge?: Badge;
  weeklyPoints: number;
  dayStreak: number;
};

export class FriendError extends Error {}

// Made-up players so there's someone to follow before other accounts exist.
// Try following "maria_codes".
export const DEMO_PLAYERS: Friend[] = [
  {
    userId: "demo-1",
    username: "maria_codes",
    weeklyPoints: 23,
    dayStreak: 12,
  },
  { userId: "demo-2", username: "dp_dan", weeklyPoints: 15, dayStreak: 7 },
  { userId: "demo-3", username: "graphgal", weeklyPoints: 9, dayStreak: 4 },
  {
    userId: "demo-4",
    username: "two_pointer_tom",
    weeklyPoints: 9,
    dayStreak: 1,
  },
  { userId: "demo-5", username: "binary_bea", weeklyPoints: 3, dayStreak: 0 },
];

// Demo players who "follow you", so the Followers tab has something in it.
// One you don't follow back yet, to show the Follow back button.
const DEMO_FOLLOWER_IDS = ["demo-2", "demo-5"];

// ---- Storage (only the stub needs this part) ------------------------------

type Stored = { userId: string; username: string };

const keyFor = (userId: string) => `stacksprint.following.${userId}`;

function readFollowing(me: User): Stored[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(keyFor(me.id)) ?? "[]",
    );
    return Array.isArray(saved)
      ? saved.filter(
          (s): s is Stored =>
            typeof s?.userId === "string" && typeof s?.username === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function writeFollowing(me: User, list: Stored[]) {
  try {
    localStorage.setItem(keyFor(me.id), JSON.stringify(list));
  } catch {
    throw new FriendError("Couldn't save that. Try again.");
  }
}

// Everyone the stub knows about: demo players plus the real weekly board.
async function directory(): Promise<{
  players: Friend[];
  you: LeaderboardEntry | null;
}> {
  const players = [...DEMO_PLAYERS];
  let you: LeaderboardEntry | null = null;
  try {
    const board = await getLeaderboard("week");
    you = board.you;
    for (const e of [...board.top, ...(board.you ? [board.you] : [])]) {
      if (!players.some((p) => p.userId === e.userId)) {
        players.push({
          userId: e.userId,
          username: e.username,
          badge: e.badge,
          weeklyPoints: e.points,
          dayStreak: 0, // the stub has no streaks for real accounts
        });
      }
    }
  } catch {
    // API down: demo players still work.
  }
  return { players, you };
}

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// ---- API ------------------------------------------------------------------

export async function getFollowing(me: User): Promise<Friend[]> {
  const { players } = await directory();
  return readFollowing(me)
    .map(
      (s) =>
        players.find((p) => p.userId === s.userId) ?? {
          // Someone we can't see anymore still shows, with no stats.
          ...s,
          weeklyPoints: 0,
          dayStreak: 0,
        },
    )
    .sort((a, b) => a.username.localeCompare(b.username));
}

// Everyone who follows you: demo followers plus any other account in this
// browser that follows you (sign in as two users to try it).
export async function getFollowers(me: User): Promise<Friend[]> {
  const { players } = await directory();
  const ids = new Set(DEMO_FOLLOWER_IDS);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("stacksprint.following.")) continue;
      const theirId = key.slice("stacksprint.following.".length);
      if (theirId === me.id) continue;
      const list: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (
        Array.isArray(list) &&
        list.some((s: { userId?: unknown }) => s?.userId === me.id)
      ) {
        ids.add(theirId);
      }
    }
  } catch {
    // Unreadable storage: just the demo followers.
  }
  return [...ids]
    .map(
      (id) =>
        players.find((p) => p.userId === id) ?? {
          // Another account in this browser that isn't on the weekly board.
          userId: id,
          username: "StackSprint player",
          weeklyPoints: 0,
          dayStreak: 0,
        },
    )
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function follow(me: User, username: string): Promise<Friend> {
  if (!username.trim()) throw new FriendError("Enter a LeetCode username.");
  const { players, you } = await directory();
  if (you && sameName(you.username, username)) {
    throw new FriendError("That's you!");
  }
  const player = players.find((p) => sameName(p.username, username));
  if (!player || player.userId === me.id) {
    throw new FriendError(
      "No StackSprint player has that LeetCode username. Check the spelling.",
    );
  }
  const list = readFollowing(me);
  if (list.some((s) => s.userId === player.userId)) {
    throw new FriendError(`You already follow ${player.username}.`);
  }
  writeFollowing(me, [
    ...list,
    { userId: player.userId, username: player.username },
  ]);
  return player;
}

export async function unfollow(me: User, userId: string): Promise<void> {
  writeFollowing(
    me,
    readFollowing(me).filter((s) => s.userId !== userId),
  );
}

// Weekly points among you and the people you follow, in the same shape as
// the global board so the Social carousel can show it as one more slide.
export async function getFriendsBoard(me: User): Promise<Leaderboard> {
  const [following, { you }] = await Promise.all([
    getFollowing(me),
    directory(),
  ]);
  const players: Omit<LeaderboardEntry, "rank">[] = following.map((f) => ({
    userId: f.userId,
    username: f.username,
    badge: f.badge,
    points: f.weeklyPoints,
  }));
  // You're only on it if you're on the global board (LeetCode linked).
  if (you) players.push({ ...you });
  const ranked = rankByPoints(players);
  return {
    period: "week",
    top: ranked.slice(0, 4),
    you: you ? ranked.find((e) => e.userId === you.userId)! : null,
  };
}

// Most points first; equal points share a rank and the next one skips
// (9, 9, 3 -> 1st, 1st, 3rd), like the global board's zeros.
function rankByPoints(
  players: Omit<LeaderboardEntry, "rank">[],
): LeaderboardEntry[] {
  const sorted = [...players].sort(
    (a, b) => b.points - a.points || a.username.localeCompare(b.username),
  );
  return sorted.map((p, i) => {
    let first = i;
    while (first > 0 && sorted[first - 1].points === p.points) first--;
    return { ...p, rank: first + 1 };
  });
}
