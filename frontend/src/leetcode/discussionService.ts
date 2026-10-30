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
  { slug: "add-two-numbers", title: "Add Two Numbers", difficulty: "medium" },
  { slug: "palindrome-number", title: "Palindrome Number", difficulty: "easy" },
  { slug: "3sum", title: "3Sum", difficulty: "medium" },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
  },
  { slug: "reverse-integer", title: "Reverse Integer", difficulty: "medium" },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
  },
];

// Stands in for the permanent unlock records 1-18 keeps in the database.
// A verified solve is what unlocks a discussion, so "unlocked" and "solved"
// are the same thing here. Two Sum and 3Sum start solved so both views are
// easy to reach. Resets on reload.
const unlocked = new Set<string>(["two-sum", "3sum"]);

// Your starred problems. Needs per-user storage on the server, so it's part
// of the Problems tab pitch; resets on reload until then.
const favorites = new Set<string>();

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

export type ProblemListItem = Problem & {
  solved: boolean; // a verified solve, which also unlocks the discussion
  favorite: boolean;
};

// The Problems tab: every problem, whether you've solved it, and whether
// you starred it. There's no backlog item for this endpoint yet; pitch it.
export async function listProblems(): Promise<ProblemListItem[]> {
  await wait(400);
  return PROBLEMS.map((p) => ({
    ...p,
    solved: unlocked.has(p.slug),
    favorite: favorites.has(p.slug),
  }));
}

export async function setFavorite(slug: string, favorite: boolean) {
  await wait(200);
  findProblem(slug);
  if (favorite) favorites.add(slug);
  else favorites.delete(slug);
}
