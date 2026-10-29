import {
  COMPLEXITIES,
  LANGUAGES,
  labelFor,
  type Post,
} from "../leetcode/postService";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Author, date, language and the two Big-O tags, shared by the post list and
// the post page.
export default function PostMeta({ post }: { post: Post }) {
  return (
    <div className="post-meta">
      <p className="post-byline">
        <span className="post-author">{post.authorName}</span>
        <time dateTime={post.createdAt}>
          {dateFormat.format(new Date(post.createdAt))}
        </time>
        {post.updatedAt && <span>(edited)</span>}
      </p>
      <ul className="post-tags" aria-label="Solution details">
        <li className="post-tag">{labelFor(LANGUAGES, post.language)}</li>
        <li className="post-tag">
          Time {labelFor(COMPLEXITIES, post.timeComplexity)}
        </li>
        <li className="post-tag">
          Space {labelFor(COMPLEXITIES, post.spaceComplexity)}
        </li>
      </ul>
    </div>
  );
}
