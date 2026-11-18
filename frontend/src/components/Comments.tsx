import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getLinkedAccount } from "../leetcode/linkService";
import {
  addComment,
  COMMENT_MAX,
  deleteComment,
  listComments,
  PostSocialError,
  validateComment,
  type Comment,
  type CommentThread,
} from "../leetcode/postSocialService";
import ErrorMessage from "./ErrorMessage";
import Loading from "./Loading";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

// Comments under a solution post (2-19). Two levels: comments on the post,
// and replies to a comment. Replies can't be replied to, so there's no Reply
// button on them.
export default function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<CommentThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  // Which thread's reply box is open (one at a time keeps the page calm).
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // Your name on new comments: your LeetCode username, like on posts.
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listComments(postId).then(
      (next) => {
        if (cancelled) return;
        setThreads(next);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [postId, reloads]);

  useEffect(() => {
    getLinkedAccount().then(
      (account) => setMyName(account?.username ?? null),
      () => setMyName(null),
    );
  }, []);

  const reload = () => setReloads((n) => n + 1);
  const authorName = myName ?? user?.email.split("@")[0] ?? "You";

  async function post(body: string, parentId: string | null) {
    if (!user) return;
    await addComment(postId, user, authorName, body, parentId);
    setReplyingTo(null);
    reload();
  }

  async function remove(commentId: string) {
    if (!user) return;
    await deleteComment(postId, commentId, user);
    reload();
  }

  const count = threads?.reduce(
    (n, t) => n + (t.deleted ? 0 : 1) + t.replies.length,
    0,
  );

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h3 id="comments-title">
        Comments{count ? <span className="comments-count"> {count}</span> : ""}
      </h3>

      <CommentForm
        id="new-comment"
        placeholder="Ask a question or say what you liked…"
        submitLabel="Comment"
        onSubmit={(body) => post(body, null)}
      />

      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!error && !threads && <Loading label="Loading comments…" />}
      {threads && threads.length === 0 && (
        <p className="comments-empty">
          No comments yet. Start the conversation.
        </p>
      )}
      {threads && threads.length > 0 && (
        <ul className="comment-list">
          {threads.map((thread) => (
            <li key={thread.id} className="comment-thread">
              <CommentItem
                comment={thread}
                isMine={thread.authorId === user?.id}
                onReply={
                  thread.deleted
                    ? undefined
                    : () =>
                        setReplyingTo(
                          replyingTo === thread.id ? null : thread.id,
                        )
                }
                onDelete={() => remove(thread.id)}
              />
              {(thread.replies.length > 0 || replyingTo === thread.id) && (
                <ul className="comment-replies">
                  {thread.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        isMine={reply.authorId === user?.id}
                        onDelete={() => remove(reply.id)}
                      />
                    </li>
                  ))}
                  {replyingTo === thread.id && (
                    <li>
                      <CommentForm
                        id={`reply-${thread.id}`}
                        placeholder={`Reply to ${thread.authorName}…`}
                        submitLabel="Reply"
                        autoFocus
                        onSubmit={(body) => post(body, thread.id)}
                        onCancel={() => setReplyingTo(null)}
                      />
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  isMine,
  onReply,
  onDelete,
}: {
  comment: Comment;
  isMine: boolean;
  onReply?: () => void; // only top-level comments get Reply
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (comment.deleted) {
    return <p className="comment-deleted">This comment was deleted.</p>;
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await onDelete(); // the list reloads without it
    } catch (err) {
      setError(
        err instanceof PostSocialError ? err.message : "Couldn't delete it.",
      );
      setBusy(false);
    }
  }

  return (
    <article className="comment">
      <p className="comment-byline">
        <span className="comment-author">{comment.authorName}</span>
        <time dateTime={comment.createdAt}>
          {dateFormat.format(new Date(comment.createdAt))}
        </time>
      </p>
      <p className="comment-body">{comment.body}</p>
      <div className="comment-actions">
        {confirming ? (
          <>
            <span>Delete this comment?</span>
            <button
              type="button"
              className="text-button is-danger"
              onClick={() => void confirmDelete()}
              disabled={busy}
            >
              Delete
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {onReply && (
              <button type="button" className="text-button" onClick={onReply}>
                Reply
              </button>
            )}
            {isMine && (
              <button
                type="button"
                className="text-button"
                onClick={() => setConfirming(true)}
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </article>
  );
}

function CommentForm({
  id,
  placeholder,
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  id: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorId = `${id}-error`;
  // Only show the counter when it matters, so it isn't noise.
  const nearLimit = body.length > COMMENT_MAX * 0.8;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateComment(body);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(body);
      setBody("");
    } catch (err) {
      setError(
        err instanceof PostSocialError ? err.message : "Couldn't post that.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor={id} className="visually-hidden">
        {placeholder}
      </label>
      <textarea
        id={id}
        rows={2}
        placeholder={placeholder}
        value={body}
        maxLength={COMMENT_MAX + 100} /* room to see the "too long" error */
        onChange={(e) => {
          setBody(e.target.value);
          setError(null);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoFocus={autoFocus}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
      <div className="comment-form-actions">
        {nearLimit && (
          <span
            className={`comment-counter${body.length > COMMENT_MAX ? " is-over" : ""}`}
          >
            {body.length}/{COMMENT_MAX}
          </span>
        )}
        {onCancel && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Posting…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
