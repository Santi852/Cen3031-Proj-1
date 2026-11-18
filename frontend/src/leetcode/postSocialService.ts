import type { User } from "../auth/authService";

// Upvotes and comments on solution posts (2-19 UI; API is Matias's 2-17).
// Rules, so the UI, the stub and the API agree:
// - One upvote per user per post, toggled on and off. You can't upvote your
//   own post (the button is disabled, and the API must refuse it too).
// - Comments are two levels: a comment on the post, and replies to that
//   comment. A reply can't be replied to (2-20 tests the depth limit).
// - Comments are 1-1000 characters. You can delete your own. A comment with
//   replies leaves a "deleted" placeholder so the replies keep their context.
//
// STUB until 2-17. Proposed contract (all behind the 1-18 solve gate):
//   POST   /problems/:slug/posts/:id/vote      -> { votes, voted } (toggles)
//          403 self_vote
//   GET    /problems/:slug/posts/:id/comments  -> CommentThread[]
//   POST   /problems/:slug/posts/:id/comments  <- { body, parentId? }
//          -> Comment; 400 too_deep if parentId is itself a reply
//   DELETE /problems/:slug/posts/:id/comments/:commentId -> 204, 403 if not
//          yours
// And the post list/detail responses gain { votes, voted, commentCount }, so
// the list can show them and sort without extra requests (2-18).
//
// Until then everything lives in this browser's localStorage, shared by all
// accounts, so you can sign in as two users to vote on each other's posts.
// Every function is async so swapping in apiFetch() later won't change any
// caller.

export const COMMENT_MAX = 1000;

export class PostSocialError extends Error {}

export type Comment = {
  id: string;
  parentId: string | null; // null = a comment on the post itself
  authorId: string;
  authorName: string;
  body: string; // "" once deleted
  deleted: boolean;
  createdAt: string; // ISO
};

// A top-level comment with its replies, oldest first, like a conversation.
export type CommentThread = Comment & { replies: Comment[] };

export type PostStats = { votes: number; voted: boolean; commentCount: number };

// ---- Storage (only the stub needs this part) ------------------------------

const VOTES_KEY = "stacksprint.postVotes"; // { [postId]: userId[] }
const COMMENTS_KEY = "stacksprint.postComments"; // { [postId]: Comment[] }

function read<T>(key: string): Record<string, T[]> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object"
      ? (value as Record<string, T[]>)
      : {};
  } catch {
    return {};
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new PostSocialError("Couldn't save that. Try again.");
  }
}

// ---- Votes ----------------------------------------------------------------

// Votes and comment counts for a list of posts, for the post list.
export async function getStats(
  postIds: string[],
  me: User,
): Promise<Map<string, PostStats>> {
  const votes = read<string>(VOTES_KEY);
  const comments = read<Comment>(COMMENTS_KEY);
  return new Map(
    postIds.map((id) => {
      const voters = votes[id] ?? [];
      return [
        id,
        {
          votes: voters.length,
          voted: voters.includes(me.id),
          // Deleted placeholders aren't real comments, so they don't count.
          commentCount: (comments[id] ?? []).filter((c) => !c.deleted).length,
        },
      ];
    }),
  );
}

export async function toggleVote(
  post: { id: string; authorId: string },
  me: User,
): Promise<{ votes: number; voted: boolean }> {
  if (post.authorId === me.id) {
    throw new PostSocialError("You can't upvote your own post.");
  }
  const all = read<string>(VOTES_KEY);
  const voters = all[post.id] ?? [];
  const voted = !voters.includes(me.id);
  all[post.id] = voted
    ? [...voters, me.id]
    : voters.filter((id) => id !== me.id);
  write(VOTES_KEY, all);
  return { votes: all[post.id].length, voted };
}

// ---- Comments -------------------------------------------------------------

export async function listComments(postId: string): Promise<CommentThread[]> {
  const comments = read<Comment>(COMMENTS_KEY)[postId] ?? [];
  const byTime = (a: Comment, b: Comment) =>
    a.createdAt.localeCompare(b.createdAt);
  return comments
    .filter((c) => c.parentId === null)
    .sort(byTime)
    .map((c) => ({
      ...c,
      replies: comments.filter((r) => r.parentId === c.id).sort(byTime),
    }));
}

// Checked here so the form can explain before sending; the API checks again.
export function validateComment(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Write something first.";
  if (trimmed.length > COMMENT_MAX) {
    return `Keep it under ${COMMENT_MAX} characters.`;
  }
  return null;
}

export async function addComment(
  postId: string,
  me: User,
  authorName: string,
  body: string,
  parentId: string | null = null,
): Promise<Comment> {
  const problem = validateComment(body);
  if (problem) throw new PostSocialError(problem);
  const all = read<Comment>(COMMENTS_KEY);
  const comments = all[postId] ?? [];
  if (parentId !== null) {
    const parent = comments.find((c) => c.id === parentId);
    if (!parent || parent.deleted) {
      throw new PostSocialError("That comment isn't there anymore.");
    }
    if (parent.parentId !== null) {
      throw new PostSocialError("You can only reply to top-level comments.");
    }
  }
  const comment: Comment = {
    id: crypto.randomUUID(),
    parentId,
    authorId: me.id,
    authorName,
    body: body.trim(),
    deleted: false,
    createdAt: new Date().toISOString(),
  };
  all[postId] = [...comments, comment];
  write(COMMENTS_KEY, all);
  return comment;
}

export async function deleteComment(
  postId: string,
  commentId: string,
  me: User,
): Promise<void> {
  const all = read<Comment>(COMMENTS_KEY);
  let comments = all[postId] ?? [];
  const target = comments.find((c) => c.id === commentId);
  if (!target) return; // already gone
  if (target.authorId !== me.id) {
    throw new PostSocialError("You can only delete your own comments.");
  }
  const hasReplies = comments.some((c) => c.parentId === commentId);
  if (hasReplies) {
    // Keep a placeholder so the replies still make sense.
    comments = comments.map((c) =>
      c.id === commentId ? { ...c, body: "", deleted: true } : c,
    );
  } else {
    comments = comments.filter((c) => c.id !== commentId);
    // A deleted placeholder whose last reply just went has nothing left to
    // hold together, so it goes too.
    const parent = comments.find((c) => c.id === target.parentId);
    if (parent?.deleted && !comments.some((c) => c.parentId === parent.id)) {
      comments = comments.filter((c) => c.id !== parent.id);
    }
  }
  all[postId] = comments;
  write(COMMENTS_KEY, all);
}
