// Discussion service, backed by Matias's 1-18 (server-side gate: no post content
// unless a verified solve exists, with a permanent unlock record). The list of
// problems and the favorites have no API yet, so those parts are still local.
import { ApiError, apiFetch } from "./apiClient";
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

// The proposal asks for a clear marker whenever data comes from a fixture.
// Only the Problems tab uses this now: its list is still a fixture, even though
// each row's solved status is real.
export const IS_DEMO = true;

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

// Your starred problems. Needs per-user storage on the server, so it's part
// of the Problems tab pitch; resets on reload until then.
const favorites = new Set<string>();

export async function getDiscussion(slug: string): Promise<Discussion> {
  try {
    return await apiFetch<Discussion>(
      `/problems/${encodeURIComponent(slug)}/discussion`,
    );
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    if (err.kind !== "not_found") {
      throw new DiscussionError("unavailable", err.message);
    }
    // The server only knows problems that some user's sync has imported, so a
    // real problem nobody has synced yet is a 404. Show it as locked: that
    // reveals nothing, and only the server can ever answer unlocked: true.
    const problem = PROBLEMS.find((p) => p.slug === slug);
    if (problem) return { problem, unlocked: false };
    throw new DiscussionError(
      "not_found",
      "We couldn't find that problem. Check the link and try again.",
    );
  }
}

// "I just solved it": sync with LeetCode (1-08, which enforces the 15-minute
// cooldown and throws a SyncError if it's still running), then ask the gate
// again. Unlocking is the server's call, never the browser's.
export async function checkSolve(slug: string): Promise<Discussion> {
  await syncLeetCode();
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
// you starred it. There's no backlog item for a list endpoint yet (pitch it),
// so this asks the gate about each sample problem.
export async function listProblems(): Promise<ProblemListItem[]> {
  return Promise.all(
    PROBLEMS.map(async (p) => ({
      ...p,
      solved: (await getDiscussion(p.slug)).unlocked,
      favorite: favorites.has(p.slug),
    })),
  );
}

export async function setFavorite(slug: string, favorite: boolean) {
  if (favorite) favorites.add(slug);
  else favorites.delete(slug);
}
