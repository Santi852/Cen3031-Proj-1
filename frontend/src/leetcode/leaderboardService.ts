// Leaderboard service. The real endpoint is Matias's 1-16 (GET /leaderboard,
// recomputed after each sync, ties broken by who reached the score first),
// which isn't built yet, so getLeaderboard() is a stub. 1-16 only covers the
// weekly board; monthly and all-time are new and need to be pitched to the
// team. Swap the body for a fetch() call once the API exists, and set
// IS_DEMO to false.

export type LeaderboardPeriod = "all" | "month" | "week";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string; // linked LeetCode username
  points: number;
};

// The page only shows the top 3 plus one more row, so the API doesn't need
// to send the whole board: the top 4, and the signed-in user's own entry.
// Everyone with 0 points shares one rank, right after the last person who
// scored (8 people scored, so all the zeros are 9th): there's no fair way to
// order them. `you` is null only if you can't be ranked at all (no LeetCode
// account linked).
export type Leaderboard = {
  period: LeaderboardPeriod;
  top: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

// The proposal asks for a clear marker whenever data comes from a fixture,
// so the page shows a "Demo data" label while this is true.
export const IS_DEMO = true;

// Pick which leaderboard state to test by hand.
const SCENARIO: "data" | "empty" | "error" = "data";

const PLAYERS = [
  "two-sum-enjoyer",
  "binary_searcher",
  "dp-or-die",
  "graph_goblin",
  "a-really-long-leetcode-username-123",
];

// Each period puts you somewhere different, so every case shows up:
// all time = outside the top 3 (your row is shown), month = inside the top 3
// (4th place is shown instead), week = 0 points, tied 9th with everyone
// else who hasn't scored.
const SAMPLE: Record<
  LeaderboardPeriod,
  { points: number[]; yourRank: number | null; yourPoints: number }
> = {
  all: { points: [412, 380, 377, 301], yourRank: 12, yourPoints: 154 },
  month: { points: [96, 88, 71, 70], yourRank: 2, yourPoints: 88 },
  week: { points: [23, 18, 18, 11], yourRank: 9, yourPoints: 0 },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// currentUserId is only used by the stub, to mark which entry is yours. The
// real API knows who's asking from the access token.
export async function getLeaderboard(
  period: LeaderboardPeriod,
  currentUserId: string,
): Promise<Leaderboard> {
  await wait(600); // simulate network latency

  switch (SCENARIO) {
    case "error":
      throw new Error("We couldn't load the leaderboard. Try again.");
    case "empty":
      return { period, top: [], you: null };
  }

  const { points, yourRank, yourPoints } = SAMPLE[period];
  const you =
    yourRank === null
      ? null
      : {
          rank: yourRank,
          userId: currentUserId,
          username: "you",
          points: yourPoints,
        };

  // Tied players (dp-or-die this week) sit after whoever reached the score
  // first, so ranks are still just positions.
  const top = points.map((p, i) =>
    you && you.rank === i + 1
      ? you
      : { rank: i + 1, userId: `demo-${i}`, username: PLAYERS[i], points: p },
  );

  return { period, top, you };
}
