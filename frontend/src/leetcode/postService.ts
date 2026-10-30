// Solution posts service, backed by Matias's 1-21 (create / edit / delete your
// own post, required language and Time + Space Big-O, unlocked users only)
// behind the 1-18 gate.
import { ApiError, apiFetch } from "./apiClient";

// The allowed values. 1-21 stores language and Big-O as enums, so these
// lists must match the API's exactly.
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

export const MAX_TITLE_LENGTH = 100;
export const MAX_CODE_LENGTH = 20_000;
export const MAX_COMMENT_LENGTH = 2_000;

export type Post = {
  id: string;
  problemSlug: string;
  authorId: string;
  authorName: string;
  title: string;
  language: Language;
  timeComplexity: Complexity;
  spaceComplexity: Complexity;
  code: string;
  comment: string;
  createdAt: string; // ISO timestamp
  updatedAt: string | null; // null until the first edit
  // Whether you liked it. Likes are new (not in 1-21): the API needs to
  // store one like per user per post and send this back for the viewer.
  // Always false until then.
  liked: boolean;
};

// What the editor sends. Empty strings mean "not picked yet"; the editor
// checks them before sending, and the server checks again (1-24 tests that).
export type PostDraft = {
  title: string;
  language: Language | "";
  timeComplexity: Complexity | "";
  spaceComplexity: Complexity | "";
  code: string;
  comment: string;
};

export type PostErrorKind = "locked" | "not_found" | "invalid" | "unavailable";

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

// Likes have no API yet, so the page hides the heart while this is false.
export const LIKES_ENABLED = false;

function toPostError(err: unknown) {
  if (!(err instanceof ApiError)) throw err;
  switch (err.kind) {
    case "locked":
      return new PostError(
        "locked",
        "Solve this problem first to see and write posts.",
      );
    case "not_found":
      // Also what the server says when it's someone else's post.
      return new PostError("not_found", "This post doesn't exist anymore.");
    case "invalid":
      return new PostError("invalid", err.message);
    default:
      return new PostError("unavailable", err.message);
  }
}

type ApiPost = Omit<Post, "updatedAt" | "liked"> & { updatedAt: string };

// The server sets updatedAt on creation too; the page expects null until the
// first edit, so it can show "(edited)".
function fromApi(post: ApiPost): Post {
  return {
    ...post,
    updatedAt: post.updatedAt === post.createdAt ? null : post.updatedAt,
    liked: false,
  };
}

const postsPath = (slug: string) =>
  `/problems/${encodeURIComponent(slug)}/posts`;

async function request<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw toPostError(err);
  }
}

function toBody(draft: PostDraft) {
  return {
    title: draft.title.trim(),
    language: draft.language,
    timeComplexity: draft.timeComplexity,
    spaceComplexity: draft.spaceComplexity,
    code: draft.code,
    comment: draft.comment.trim(),
  };
}

// Newest first. The API sends at most 50 at a time.
export function listPosts(slug: string): Promise<Post[]> {
  return request(async () =>
    (await apiFetch<ApiPost[]>(postsPath(slug))).map(fromApi),
  );
}

export function getPost(slug: string, id: string): Promise<Post> {
  return request(async () =>
    fromApi(await apiFetch<ApiPost>(`${postsPath(slug)}/${id}`)),
  );
}

export function createPost(slug: string, draft: PostDraft): Promise<Post> {
  return request(async () =>
    fromApi(
      await apiFetch<ApiPost>(postsPath(slug), {
        method: "POST",
        body: toBody(draft),
      }),
    ),
  );
}

export function updatePost(
  slug: string,
  id: string,
  draft: PostDraft,
): Promise<Post> {
  return request(async () =>
    fromApi(
      await apiFetch<ApiPost>(`${postsPath(slug)}/${id}`, {
        method: "PUT",
        body: toBody(draft),
      }),
    ),
  );
}

export function deletePost(slug: string, id: string): Promise<void> {
  return request(() =>
    apiFetch<void>(`${postsPath(slug)}/${id}`, { method: "DELETE" }),
  );
}

// Nothing calls this while LIKES_ENABLED is false.
export const setLiked: (
  slug: string,
  id: string,
  liked: boolean,
) => Promise<void> = async () => {
  throw new PostError("unavailable", "Likes aren't available yet.");
};
