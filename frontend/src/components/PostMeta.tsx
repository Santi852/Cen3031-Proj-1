import { useTimeZone } from "../settings/TimeZoneContext";
import { formatLocalDateTime } from "../settings/dates";
import {
  COMPLEXITIES,
  LANGUAGES,
  labelFor,
  type Post,
} from "../leetcode/postService";

// Author, date, language and the two Big-O tags, shared by the post list and
// the post page.
export default function PostMeta({ post }: { post: Post }) {
  const { timeZone } = useTimeZone();
  return (
    <div className="post-meta">
      <p className="post-byline">
        <span className="post-author">{post.authorName}</span>
        <time
          dateTime={post.createdAt}
          title={formatLocalDateTime(post.createdAt, timeZone)}
        >
          {new Intl.DateTimeFormat(undefined, {
            timeZone,
            dateStyle: "medium",
          }).format(new Date(post.createdAt))}
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
