import { ApiError, weekStart, type LeetCodeConnector } from "./leetcode.js";

// Explicit teaching/demo fixtures, never a fallback for a failed live request.
export function createDemoConnector(now = () => new Date()): LeetCodeConnector {
  const instant = now();
  const start = weekStart(instant).getTime();
  const problems = [
    { slug: "two-sum", title: "Two Sum", difficulty: "easy" as const },
    {
      slug: "add-two-numbers",
      title: "Add Two Numbers",
      difficulty: "medium" as const,
    },
    {
      slug: "trapping-rain-water",
      title: "Trapping Rain Water",
      difficulty: "hard" as const,
    },
  ];
  function check(username: string) {
    if (username === "missing-user")
      throw new ApiError(404, "not_found", "LeetCode profile not found.");
    if (username === "private-user")
      throw new ApiError(
        422,
        "private",
        "LeetCode profile statistics are private.",
      );
    if (username === "down")
      throw new ApiError(
        503,
        "unavailable",
        "Demo provider unavailable. Your existing data is unchanged.",
      );
  }
  return {
    async profile(username) {
      check(username);
      return { username, counts: { easy: 1, medium: 1, hard: 1 } };
    },
    async recent(username) {
      check(username);
      return problems.map((problem, index) => ({
        ...problem,
        solvedAt: new Date(
          Math.max(start, instant.getTime() - (index + 1) * 60000),
        ).toISOString(),
        submissionId: `demo-${problem.slug}`,
      }));
    },
  };
}
