import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPosts, type Post } from "../leetcode/postService";
import EmptyState from "./EmptyState";
import ErrorMessage from "./ErrorMessage";
import { ArrowUpRightIcon } from "./icons";
import Loading from "./Loading";
import PostMeta from "./PostMeta";

type Result =
  | { key: string; ok: true; posts: Post[] }
  | { key: string; ok: false; message: string };

// Solution posts for an unlocked problem (1-23), newest first.
export default function PostList({ slug }: { slug: string }) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${slug}:${reloads}`;

  useEffect(() => {
    const requestKey = `${slug}:${reloads}`;
    let cancelled = false;
    listPosts(slug).then(
      (posts) => {
        if (!cancelled) setResult({ key: requestKey, ok: true, posts });
      },
      (err: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          ok: false,
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, reloads]);

  if (!result || result.key !== key) {
    return <Loading label="Loading posts…" />;
  }
  if (!result.ok) {
    return (
      <ErrorMessage
        message={result.message}
        onRetry={() => setReloads((n) => n + 1)}
      />
    );
  }
  if (result.posts.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        message="Be the first to share how you solved it."
        action={
          <Link className="button button-primary" to={`/problem/${slug}/new`}>
            Write a post
          </Link>
        }
      />
    );
  }

  return (
    <ul className="post-list">
      {result.posts.map((post) => (
        <li key={post.id}>
          {/* The whole card is the link, so anywhere on it is a tap target.
              The code stays on the post's own page. */}
          <Link className="post-card" to={`/problem/${slug}/posts/${post.id}`}>
            <div className="post-card-header">
              <h4 className="post-card-title">{post.title}</h4>
              <ArrowUpRightIcon />
            </div>
            <PostMeta post={post} />
            {post.comment && (
              <p className="post-card-comment">{post.comment}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
