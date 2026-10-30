import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CodeBlock from "../components/CodeBlock";
import ErrorMessage from "../components/ErrorMessage";
import { HeartIcon } from "../components/icons";
import Loading from "../components/Loading";
import PostMeta from "../components/PostMeta";
import {
  deletePost,
  getPost,
  LANGUAGES,
  labelFor,
  PostError,
  setLiked,
  type Post,
} from "../leetcode/postService";

type Result =
  | { key: string; ok: true; post: Post }
  | { key: string; ok: false; message: string; canRetry: boolean };

// One solution post, in full (1-23). Its author also gets Edit and Delete.
export default function PostDetail() {
  const { slug = "", postId = "" } = useParams();
  const { user } = useAuth();
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${slug}:${postId}:${reloads}`;

  useEffect(() => {
    const requestKey = `${slug}:${postId}:${reloads}`;
    let cancelled = false;
    getPost(slug, postId).then(
      (post) => {
        if (!cancelled) setResult({ key: requestKey, ok: true, post });
      },
      (err: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          ok: false,
          message: err instanceof Error ? err.message : "Something went wrong.",
          // Retrying won't unlock a problem or bring back a deleted post.
          canRetry: !(err instanceof PostError) || err.kind === "unavailable",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, postId, reloads]);

  const back = (
    <Link to={`/problem/${slug}`} className="back-link">
      ← Back to discussion
    </Link>
  );

  if (!result || result.key !== key) {
    return <Loading label="Loading the post…" />;
  }
  if (!result.ok) {
    return (
      <section className="post-page">
        {back}
        <ErrorMessage
          message={result.message}
          onRetry={result.canRetry ? () => setReloads((n) => n + 1) : undefined}
        />
      </section>
    );
  }

  const { post } = result;
  const isOwner = user?.id === post.authorId;

  return (
    <section className="post-page" aria-labelledby="post-title">
      {back}
      {/* Title and byline grouped, so the title sits right above the
          author instead of a full section gap away. */}
      <header className="post-header">
        <div className="post-title-row">
          <h2 id="post-title">{post.title}</h2>
          <LikeButton slug={slug} post={post} />
        </div>
        <PostMeta post={post} />
      </header>
      {post.comment && <p className="post-comment">{post.comment}</p>}
      <CodeBlock
        code={post.code}
        language={post.language}
        label={`${labelFor(LANGUAGES, post.language)} code`}
      />
      {isOwner && <OwnerActions slug={slug} post={post} userId={user.id} />}
    </section>
  );
}

// Delete asks once more inline instead of a browser confirm() popup, which
// can't be styled and blocks the whole page.
function OwnerActions({
  slug,
  post,
  userId,
}: {
  slug: string;
  post: Post;
  userId: string;
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await deletePost(slug, post.id, userId);
      navigate(`/problem/${slug}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete the post.",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="post-actions">
      {error && <ErrorMessage message={error} />}
      {confirming ? (
        <div className="post-confirm" role="group" aria-label="Confirm delete">
          <p>Delete this post? This can't be undone.</p>
          <button
            type="button"
            className="button button-danger"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <Link
            className="button"
            to={`/problem/${slug}/posts/${post.id}/edit`}
          >
            Edit
          </Link>
          <button
            type="button"
            className="button"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}

// The heart fills in right away and is undone if saving fails, so tapping
// it never feels slow.
function LikeButton({ slug, post }: { slug: string; post: Post }) {
  const [liked, setLikedState] = useState(post.liked);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !liked;
    setLikedState(next);
    setFailed(false);
    try {
      await setLiked(slug, post.id, next);
    } catch {
      setLikedState(!next);
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      className={liked ? "like-button is-liked" : "like-button"}
      aria-label="Like this solution"
      aria-pressed={liked}
      title={failed ? "Couldn't save your like. Try again." : undefined}
      onClick={() => void toggle()}
    >
      <HeartIcon />
    </button>
  );
}
