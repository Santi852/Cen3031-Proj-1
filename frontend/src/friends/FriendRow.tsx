import { useState, type ReactNode } from "react";
import { DEFAULT_BADGE, isBadge } from "../badge/badge";
import BadgeIcon from "../badge/BadgeIcon";
import { FlameIcon } from "../components/icons";
import { FriendError, type Friend } from "./friendService";

// One person in the Friends sheet: badge, name, this week's points and day
// streak, with a button on the right (Unfollow or Follow back).
export default function FriendRow({
  friend,
  action,
}: {
  friend: Friend;
  action: ReactNode;
}) {
  return (
    <li className="friend-row">
      <BadgeIcon
        badge={isBadge(friend.badge) ? friend.badge : DEFAULT_BADGE}
        decorative
      />
      <div className="friend-row-text">
        <span className="friend-row-name" title={friend.username}>
          {friend.username}
        </span>
        <span className="friend-row-meta">
          {friend.weeklyPoints} pts this week
          <span
            className={`friend-row-streak${friend.dayStreak > 0 ? " is-lit" : ""}`}
          >
            <FlameIcon />
            {friend.dayStreak}
            <span className="visually-hidden">-day streak</span>
          </span>
        </span>
      </div>
      {action}
    </li>
  );
}

// Following tab: Unfollow asks first, right in the row, like Leave in league
// settings.
export function UnfollowAction({
  username,
  onUnfollow,
}: {
  username: string;
  onUnfollow: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onUnfollow(); // the row disappears on success
    } catch (err) {
      setError(err instanceof FriendError ? err.message : "Couldn't unfollow.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="text-button friend-row-unfollow"
        onClick={() => setConfirming(true)}
        aria-label={`Unfollow ${username}`}
      >
        Unfollow
      </button>
    );
  }
  return (
    <div className="friend-row-confirm">
      {error && <span className="field-error">{error}</span>}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        type="button"
        className="button button-danger"
        onClick={() => void confirm()}
        disabled={busy}
        aria-label={`Unfollow ${username}`}
      >
        Unfollow
      </button>
    </div>
  );
}

// Followers tab: "Follow back" if you don't follow them yet, otherwise a
// quiet "Following" label (unfollowing lives in the Following tab).
export function FollowBackAction({
  username,
  following,
  onFollow,
}: {
  username: string;
  following: boolean;
  onFollow: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (following) return <span className="friend-row-status">Following</span>;

  async function followBack() {
    setBusy(true);
    setError(null);
    try {
      await onFollow(); // flips to "Following" once the list reloads
    } catch (err) {
      setError(err instanceof FriendError ? err.message : "Couldn't follow.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="friend-row-confirm">
      {error && <span className="field-error">{error}</span>}
      <button
        type="button"
        className="button button-primary"
        onClick={() => void followBack()}
        disabled={busy}
        aria-label={`Follow ${username} back`}
      >
        Follow back
      </button>
    </div>
  );
}
