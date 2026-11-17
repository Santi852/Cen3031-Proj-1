import { useEffect, useRef, useState } from "react";
import { DEFAULT_BADGE, isBadge } from "../badge/badge";
import BadgeIcon from "../badge/BadgeIcon";
import type { LeaderboardEntry } from "../leetcode/leaderboardService";
import { FriendError } from "./friendService";
import { useFollowing } from "./useFollowing";

// Opens when you tap someone's name on a board: their badge, name and
// points, with Follow / Unfollow. Mounted only while open.
export default function PlayerSheet({
  player,
  onClose,
}: {
  player: LeaderboardEntry;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { state, follow, unfollow, isFollowing } = useFollowing();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const following = isFollowing(player.userId);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (following) await unfollow(player.userId);
      else await follow(player.username);
    } catch (err) {
      setError(err instanceof FriendError ? err.message : "Couldn't do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="friend-sheet"
      aria-labelledby="player-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="friend-sheet-content player-sheet">
        <div className="player-sheet-badge">
          <BadgeIcon
            badge={isBadge(player.badge) ? player.badge : DEFAULT_BADGE}
            decorative
          />
        </div>
        <h2 id="player-sheet-title">{player.username}</h2>
        <p className="player-sheet-meta">
          #{player.rank} · {player.points} pts
        </p>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="friend-sheet-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Close
          </button>
          {/* Wait for the follow list so the button doesn't flip from
              Follow to Unfollow a moment after opening. */}
          <button
            type="button"
            className={`button ${following ? "button-secondary" : "button-primary"}`}
            disabled={busy || state.status !== "ready"}
            onClick={() => void toggle()}
          >
            {following ? "Unfollow" : "Follow"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
