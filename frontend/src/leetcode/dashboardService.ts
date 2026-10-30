// Dashboard service, backed by Matias's 1-12 (weekly and 30-day LeetCode
// solves by difficulty).
import { apiFetch } from "./apiClient";
import type { DifficultyCounts } from "./linkService";

export type DashboardRange = "week" | "30d";

export type LeetCodeStats =
  | { linked: false }
  | { linked: true; username: string; counts: DifficultyCounts };

export type DashboardData = {
  range: DashboardRange;
  leetcode: LeetCodeStats;
};

export function getDashboard(range: DashboardRange): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/dashboard?range=${range}`);
}
