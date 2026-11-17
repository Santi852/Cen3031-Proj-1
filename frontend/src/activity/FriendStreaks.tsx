import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMyBadge } from "../badge/useMyBadge";
import { boardRows } from "../components/boardRows";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { FlameIcon } from "../components/icons";
import LeaderboardRow from "../components/LeaderboardRow";
import Loading from "../components/Loading";
import { openFriends } from "../friends/openFriends";
import { FOLLOWING_CHANGED } from "../friends/useFollowing";
import { getFriendStreaks, type StreakBoard } from "./activityService";

// The Friends tab of the Activity card: you and the people you follow, ranked
// by day streak. Same rows and "top 3 + you" rule as the Social leaderboard.
export default function FriendStreaks({ reloadKey }: { reloadKey: number }) {
  const { user } = useAuth();
  const { badge: myBadge } = useMyBadge(user?.id);
  const [board, setBoard] = useState<StreakBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getFriendStreaks().then(
        (next) => {
          if (cancelled) return;
          setBoard(next);
          setError(null);
        },
        (err: unknown) => {
          if (cancelled) return;
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        },
      );
    load();
    // Follow someone on Social and this board picks them up.
    window.addEventListener(FOLLOWING_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(FOLLOWING_CHANGED, load);
    };
  }, [reloadKey, retries]);

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={() => setRetries((n) => n + 1)} />
    );
  }
  if (!board) return <Loading label="Loading your friends' streaks…" />;
  if (board.followingCount === 0) {
    return (
      <EmptyState
        title="No friends to compare with yet"
        message="Follow people and their streaks show up here next to yours."
        action={
          <button
            type="button"
            className="button button-secondary"
            onClick={() => openFriends()}
          >
            Find friends
          </button>
        }
      />
    );
  }

  return (
    <ol className="leaderboard-list streak-board">
      {boardRows(board.top, board.you).map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          // The row expects leaderboard fields; the streak goes in points.
          entry={{ ...entry, points: entry.streak }}
          isYou={entry.userId === board.you.userId}
          myBadge={myBadge}
          afterGap={entry.rank > 4}
          score={
            <span
              className={`leaderboard-points streak-score${entry.streak > 0 ? " is-lit" : ""}`}
            >
              <FlameIcon />
              {entry.streak}
              <span className="visually-hidden">-day streak</span>
            </span>
          }
        />
      ))}
    </ol>
  );
}
