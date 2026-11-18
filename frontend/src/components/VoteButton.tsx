import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Post } from "../leetcode/postService";
import { PostSocialError, toggleVote } from "../leetcode/postSocialService";
import { UpvoteIcon } from "./icons";

// The upvote pill on a post's page (2-19): arrow + count. It updates right
// away and is undone if saving fails, so tapping never feels slow. Your own
// post shows the count but can't be voted on.
export default function VoteButton({ post }: { post: Post }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState(post.votes);
  const [voted, setVoted] = useState(post.voted);
  const [error, setError] = useState<string | null>(null);
  const isOwn = user?.id === post.authorId;

  async function toggle() {
    if (!user || isOwn) return;
    const before = { votes, voted };
    // Optimistic: show the new state first, fix it up with the real answer.
    setVoted(!voted);
    setVotes(votes + (voted ? -1 : 1));
    setError(null);
    try {
      const saved = await toggleVote(post, user);
      setVotes(saved.votes);
      setVoted(saved.voted);
    } catch (err) {
      setVotes(before.votes);
      setVoted(before.voted);
      setError(
        err instanceof PostSocialError
          ? err.message
          : "Couldn't save your vote.",
      );
    }
  }

  const label = isOwn
    ? `${votes} ${votes === 1 ? "upvote" : "upvotes"}. You can't upvote your own post.`
    : voted
      ? `Remove your upvote (${votes})`
      : `Upvote this solution (${votes})`;

  return (
    <button
      type="button"
      className={`vote-button${voted ? " is-voted" : ""}`}
      aria-pressed={isOwn ? undefined : voted}
      aria-label={label}
      // The tooltip says why it's disabled, or why the vote didn't save.
      title={error ?? (isOwn ? "You can't upvote your own post" : undefined)}
      disabled={isOwn}
      onClick={() => void toggle()}
    >
      <UpvoteIcon />
      <span aria-hidden="true">{votes}</span>
    </button>
  );
}
