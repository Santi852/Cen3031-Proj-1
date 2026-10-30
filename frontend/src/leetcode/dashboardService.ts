// Dashboard service. The real endpoint is Matias's 1-12 (weekly and 30-day
// LeetCode solves by difficulty), which isn't built yet, so getDashboard() is
// a stub. Swap the body for a fetch() call once 1-12 is merged, and set
// IS_DEMO to false.
import { getLinkedUsername, type DifficultyCounts } from "./linkService";

export type DashboardRange = "week" | "30d";

export type LeetCodeStats =
  | { linked: false }
  | { linked: true; username: string; counts: DifficultyCounts };

export type DashboardData = {
  range: DashboardRange;
  leetcode: LeetCodeStats;
};

// The proposal asks for a clear marker whenever data comes from a fixture,
// so the page shows a "Demo data" label while this is true.
export const IS_DEMO = true;

// Pick which dashboard state to test by hand.
const SCENARIO: "data" | "unlinked" | "empty" | "error" = "unlinked";

const SAMPLE: Record<DashboardRange, DifficultyCounts> = {
  week: { easy: 3, medium: 2, hard: 0 },
  "30d": { easy: 12, medium: 7, hard: 1 },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboard(
  range: DashboardRange,
): Promise<DashboardData> {
  await wait(600); // simulate network latency

  // A link made on the Link Account page wins over "unlinked", so the
  // sign up > link > dashboard flow works end to end with the stubs.
  const username = getLinkedUsername();

  switch (SCENARIO) {
    case "error":
      throw new Error("We couldn't load your stats. Try again.");
    case "unlinked":
      if (!username) return { range, leetcode: { linked: false } };
      break;
    case "empty":
      return {
        range,
        leetcode: {
          linked: true,
          username: username ?? "demo-user",
          counts: { easy: 0, medium: 0, hard: 0 },
        },
      };
  }

  return {
    range,
    leetcode: {
      linked: true,
      username: username ?? "demo-user",
      counts: SAMPLE[range],
    },
  };
}
