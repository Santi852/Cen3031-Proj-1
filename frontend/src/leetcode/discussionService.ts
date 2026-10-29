// Discussion service. The real endpoint is Matias's 1-18 (server-side gate:
// no post content unless a verified solve exists, with a permanent unlock
// record), which isn't built yet, so these functions are stubs. Swap the
// bodies for fetch() calls once 1-18 is merged, and set IS_DEMO to false.
import { syncLeetCode } from "./syncService";

export type Difficulty = "easy" | "medium" | "hard";

export type Problem = {
  slug: string; // LeetCode's URL name, e.g. "two-sum"
  title: string;
  difficulty: Difficulty;
};

// What the gate returns. A locked discussion carries no posts at all, not
// even a count, so there's nothing to peek at in the network tab.
export type Discussion =
  { problem: Problem; unlocked: false } | { problem: Problem; unlocked: true };

export type DiscussionErrorKind = "not_found" | "unavailable";

export class DiscussionError extends Error {
  kind: DiscussionErrorKind;

  constructor(kind: DiscussionErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

// The proposal asks for a clear marker whenever data comes from a fixture,
// so the page shows a "Demo data" label while this is true.
export const IS_DEMO = true;

// Flip to false to test "we synced but didn't find a solve".
const SOLVE_FOUND_ON_SYNC = true;

const PROBLEMS: Problem[] = [
  { slug: "two-sum", title: "Two Sum", difficulty: "easy" },
  { slug: "valid-parentheses", title: "Valid Parentheses", difficulty: "easy" },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
  },
  {
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
  },
];

// Stands in for the permanent unlock records 1-18 keeps in the database.
// Two Sum starts unlocked so both views are easy to reach. Resets on reload.
const unlocked = new Set<string>(["two-sum"]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function findProblem(slug: string): Problem {
  const problem = PROBLEMS.find((p) => p.slug === slug);
  if (!problem) {
    throw new DiscussionError(
      "not_found",
      "We couldn't find that problem. Check the link and try again.",
    );
  }
  return problem;
}

// For the posts stub (1-21), which sits behind the same gate.
export function isUnlocked(slug: string) {
  return unlocked.has(slug);
}

export async function getDiscussion(slug: string): Promise<Discussion> {
  await wait(500); // simulate network latency
  const problem = findProblem(slug);
  return unlocked.has(slug)
    ? { problem, unlocked: true }
    : { problem, unlocked: false };
}

// "I just solved it": sync with LeetCode (1-08, which enforces the 15-minute
// cooldown and throws a SyncError if it's still running), then ask the gate
// again. Unlocking is the server's call, never the browser's.
export async function checkSolve(slug: string): Promise<Discussion> {
  await syncLeetCode();
  if (SOLVE_FOUND_ON_SYNC) unlocked.add(slug);
  return getDiscussion(slug);
}

// For the sample links on the page; the real list would come from the API.
export function listSampleProblems() {
  return PROBLEMS;
}
