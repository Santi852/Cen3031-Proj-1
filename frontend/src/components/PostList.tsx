import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LANGUAGES,
  labelFor,
  listPosts,
  type Post,
} from "../leetcode/postService";
import CodeBlock from "./CodeBlock";
import EmptyState from "./EmptyState";
import ErrorMessage from "./ErrorMessage";
import Loading from "./Loading";
import PostMeta from "./PostMeta";

// The list shows the start of each solution; the full post is one tap away.
const PREVIEW_LINES = 8;

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
      {result.posts.map((post) => {
        const lines = post.code.split("\n");
        const truncated = lines.length > PREVIEW_LINES;
        return (
          <li key={post.id}>
            <article className="post-card">
              <PostMeta post={post} />
              <div className={truncated ? "post-preview truncated" : undefined}>
                <CodeBlock
                  code={lines.slice(0, PREVIEW_LINES).join("\n")}
                  language={post.language}
                  label={`${labelFor(LANGUAGES, post.language)} solution by ${post.authorName}, preview`}
                />
              </div>
              <Link
                className="post-card-link"
                to={`/problem/${slug}/posts/${post.id}`}
              >
                Read full post
                <span className="visually-hidden"> by {post.authorName}</span>
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
