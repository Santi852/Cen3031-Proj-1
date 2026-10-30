// Leaderboard service, backed by Matias's 1-16 (GET /leaderboard, recomputed
// after each sync, ties broken by who reached the score first). 1-16 only
// covers the weekly board; monthly and all-time are new and need to be pitched
// to the team, and the API answers 400 for them until then.
import { apiFetch } from "./apiClient";

export type LeaderboardPeriod = "all" | "month" | "week";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string; // linked LeetCode username
  points: number;
};

// The page only shows the top 3 plus one more row, so the API doesn't need
// to send the whole board: the top 4, and the signed-in user's own entry.
// Tied players share a rank, including everyone with 0 points. `you` is null
// only if you can't be ranked at all (no LeetCode account linked).
export type Leaderboard = {
  period: LeaderboardPeriod;
  top: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

export function getLeaderboard(
  period: LeaderboardPeriod,
): Promise<Leaderboard> {
  return apiFetch<Leaderboard>(`/leaderboard?period=${period}`);
}
