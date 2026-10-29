// Solution posts service. The real endpoints are Matias's 1-21 (create /
// edit / delete your own post, required language and Time + Space Big-O,
// unlocked users only) behind the 1-18 gate, which aren't built yet, so these
// functions are stubs. Swap the bodies for fetch() calls once 1-21 is merged.
import { isUnlocked } from "./discussionService";
import { getLinkedUsername } from "./linkService";

// The allowed values. 1-21 stores language and Big-O as enums, so these
// lists must match the API's exactly; check them when wiring up the fetch.
export const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
] as const;

export const COMPLEXITIES = [
  { value: "O(1)", label: "O(1)" },
  { value: "O(log n)", label: "O(log n)" },
  { value: "O(n)", label: "O(n)" },
  { value: "O(n log n)", label: "O(n log n)" },
  { value: "O(n^2)", label: "O(n²)" },
  { value: "O(n^3)", label: "O(n³)" },
  { value: "O(2^n)", label: "O(2ⁿ)" },
  { value: "O(n!)", label: "O(n!)" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];
export type Complexity = (typeof COMPLEXITIES)[number]["value"];

export const MAX_CODE_LENGTH = 20_000;
export const MAX_NOTES_LENGTH = 2_000;

export type Post = {
  id: string;
  problemSlug: string;
  authorId: string;
  authorName: string;
  language: Language;
  timeComplexity: Complexity;
  spaceComplexity: Complexity;
  code: string;
  notes: string;
  createdAt: string; // ISO timestamp
  updatedAt: string | null; // null until the first edit
};

// What the editor sends. Empty strings mean "not picked yet"; the editor
// checks them before sending, and the server checks again (1-24 tests that).
export type PostDraft = {
  language: Language | "";
  timeComplexity: Complexity | "";
  spaceComplexity: Complexity | "";
  code: string;
  notes: string;
};

export type PostErrorKind =
  "locked" | "not_found" | "forbidden" | "invalid" | "unavailable";

export class PostError extends Error {
  kind: PostErrorKind;

  constructor(kind: PostErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string,
) {
  return list.find((item) => item.value === value)?.label ?? value;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 60 * 60_000).toISOString();

// Stands in for the posts table. Resets on page reload.
let posts: Post[] = [
  {
    id: "sample-1",
    problemSlug: "two-sum",
    authorId: "demo-1",
    authorName: "two-sum-enjoyer",
    language: "python",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}  # value -> index
        for i, num in enumerate(nums):
            if target - num in seen:
                return [seen[target - num], i]
            seen[num] = i
        return []`,
    notes:
      "One pass with a hash map. For each number, check whether its complement was already seen.",
    createdAt: hoursAgo(5),
    updatedAt: null,
  },
  {
    id: "sample-2",
    problemSlug: "two-sum",
    authorId: "demo-2",
    authorName: "binary_searcher",
    language: "java",
    timeComplexity: "O(n^2)",
    spaceComplexity: "O(1)",
    code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[0];
    }
}`,
    notes:
      "Brute force first, to have something correct. No extra memory, but it's quadratic.",
    createdAt: hoursAgo(30),
    updatedAt: null,
  },
];

// The gate (1-18): no post content at all for a locked problem.
function requireUnlocked(slug: string) {
  if (!isUnlocked(slug)) {
    throw new PostError(
      "locked",
      "Solve this problem first to see and write posts.",
    );
  }
}

function findPost(slug: string, id: string) {
  const post = posts.find((p) => p.problemSlug === slug && p.id === id);
  if (!post) {
    throw new PostError("not_found", "This post doesn't exist anymore.");
  }
  return post;
}

function requireOwner(post: Post, userId: string) {
  if (post.authorId !== userId) {
    throw new PostError("forbidden", "You can only change your own posts.");
  }
}

function checkDraft(
  draft: PostDraft,
): Omit<
  Post,
  "id" | "problemSlug" | "authorId" | "authorName" | "createdAt" | "updatedAt"
> {
  const { language, timeComplexity, spaceComplexity } = draft;
  if (
    !language ||
    !timeComplexity ||
    !spaceComplexity ||
    !draft.code.trim() ||
    draft.code.length > MAX_CODE_LENGTH ||
    draft.notes.length > MAX_NOTES_LENGTH
  ) {
    throw new PostError("invalid", "Some fields are missing or too long.");
  }
  return {
    language,
    timeComplexity,
    spaceComplexity,
    code: draft.code,
    notes: draft.notes.trim(),
  };
}

// Newest first.
export async function listPosts(slug: string): Promise<Post[]> {
  await wait(400);
  requireUnlocked(slug);
  return posts
    .filter((p) => p.problemSlug === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(slug: string, id: string): Promise<Post> {
  await wait(300);
  requireUnlocked(slug);
  return findPost(slug, id);
}

// author is only used by the stub; the real API knows who's asking from the
// access token and uses their linked LeetCode username.
export async function createPost(
  slug: string,
  draft: PostDraft,
  author: { id: string; email: string },
): Promise<Post> {
  await wait(600);
  requireUnlocked(slug);
  const post: Post = {
    ...checkDraft(draft),
    id: crypto.randomUUID(),
    problemSlug: slug,
    authorId: author.id,
    authorName: getLinkedUsername() ?? author.email.split("@")[0],
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  posts = [...posts, post];
  return post;
}

export async function updatePost(
  slug: string,
  id: string,
  draft: PostDraft,
  userId: string,
): Promise<Post> {
  await wait(600);
  requireUnlocked(slug);
  const existing = findPost(slug, id);
  requireOwner(existing, userId);
  const updated: Post = {
    ...existing,
    ...checkDraft(draft),
    updatedAt: new Date().toISOString(),
  };
  posts = posts.map((p) => (p.id === id ? updated : p));
  return updated;
}

export async function deletePost(
  slug: string,
  id: string,
  userId: string,
): Promise<void> {
  await wait(400);
  requireUnlocked(slug);
  requireOwner(findPost(slug, id), userId);
  posts = posts.filter((p) => p.id !== id);
}
