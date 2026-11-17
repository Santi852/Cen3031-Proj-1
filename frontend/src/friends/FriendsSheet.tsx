import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";
import Loading from "../components/Loading";
import { getMyLeagues, type LeagueSummary } from "../leagues/leagueService";
import FriendRow, { FollowBackAction, UnfollowAction } from "./FriendRow";
import { FriendError } from "./friendService";
import type { FriendsTab } from "./openFriends";
import { useFollowing } from "./useFollowing";

// The Friends sheet, opened from the top bar (#93): who you follow, who
// follows you, and the leagues you're in. Same sheet look as Help used to
// have. Mounted only while open.
export default function FriendsSheet({
  initialTab,
  onClose,
}: {
  initialTab: FriendsTab;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<FriendsTab>(initialTab);
  const { state, follow, unfollow, isFollowing, retry } = useFollowing();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const count = (n: number | undefined) => (n === undefined ? "" : ` ${n}`);
  const tabs: { value: FriendsTab; label: string }[] = [
    {
      value: "following",
      label: `Following${count(state.status === "ready" ? state.following.length : undefined)}`,
    },
    {
      value: "followers",
      label: `Followers${count(state.status === "ready" ? state.followers.length : undefined)}`,
    },
    { value: "leagues", label: "Leagues" },
  ];

  let body;
  if (tab === "leagues") {
    body = <LeaguesTab onNavigate={onClose} />;
  } else if (state.status === "loading") {
    body = <Loading label="Loading your friends…" />;
  } else if (state.status === "error") {
    body = <ErrorMessage message={state.message} onRetry={retry} />;
  } else if (tab === "following") {
    body = (
      <>
        <FollowForm follow={follow} />
        {state.following.length === 0 ? (
          <EmptyState
            title="You're not following anyone yet"
            message="Add someone by their LeetCode username, or tap a name on any leaderboard."
          />
        ) : (
          <ul className="friend-list">
            {state.following.map((friend) => (
              <FriendRow
                key={friend.userId}
                friend={friend}
                action={
                  <UnfollowAction
                    username={friend.username}
                    onUnfollow={() => unfollow(friend.userId)}
                  />
                }
              />
            ))}
          </ul>
        )}
      </>
    );
  } else {
    body =
      state.followers.length === 0 ? (
        <EmptyState
          title="No followers yet"
          message="When someone follows you, they show up here."
        />
      ) : (
        <ul className="friend-list">
          {state.followers.map((friend) => (
            <FriendRow
              key={friend.userId}
              friend={friend}
              action={
                <FollowBackAction
                  username={friend.username}
                  following={isFollowing(friend.userId)}
                  onFollow={() => follow(friend.username)}
                />
              }
            />
          ))}
        </ul>
      );
  }

  return (
    <dialog
      ref={dialogRef}
      className="friend-sheet"
      aria-labelledby="friends-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="friend-sheet-content friends-sheet">
        <div className="friends-sheet-header">
          <h2 id="friends-sheet-title">Friends</h2>
          <button type="button" className="button" onClick={onClose}>
            Done
          </button>
        </div>

        {/* Same pill toggle as the dashboard, stretched across the sheet. */}
        <div
          className="range-toggle friends-tabs"
          role="group"
          aria-label="Show"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              className="range-toggle-option"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {body}
      </div>
    </dialog>
  );
}

// Follow by username, right at the top of the Following tab.
function FollowForm({
  follow,
}: {
  follow: ReturnType<typeof useFollowing>["follow"];
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Enter a LeetCode username.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await follow(value);
      setValue(""); // ready for the next one
    } catch (err) {
      setError(
        err instanceof FriendError ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="follow-form" onSubmit={handleSubmit} noValidate>
      <FormField
        id="follow-input"
        label="Follow by LeetCode username"
        placeholder="e.g. maria_codes"
        value={value}
        error={error}
        onChange={(event) => {
          setValue(event.target.value);
          setError(undefined);
        }}
        autoComplete="off"
        // Usernames aren't sentences: no auto capital, no "corrections".
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? "Following…" : "Follow"}
      </button>
    </form>
  );
}

// The leagues you're in, as links. Creating and joining stay on Social, so
// this tab only points there.
function LeaguesTab({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyLeagues(user).then(
      (next) => {
        if (cancelled) return;
        setLeagues(next);
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
  }, [user, retries]);

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={() => setRetries((n) => n + 1)} />
    );
  }
  if (!leagues) return <Loading label="Loading your leagues…" />;

  return (
    <>
      {leagues.length === 0 ? (
        <EmptyState
          title="No leagues yet"
          message="Create one or join a friend's with their code."
        />
      ) : (
        <ul className="league-list">
          {leagues.map((league) => (
            <li key={league.id}>
              {/* The sheet stays open across pages (it's in the top bar),
                  so close it when you go to a league. */}
              <Link
                to={`/social/leagues/${league.id}`}
                className="league-card"
                onClick={onNavigate}
              >
                <span className="league-card-name">{league.name}</span>
                <span className="league-card-meta">
                  {league.memberCount}{" "}
                  {league.memberCount === 1 ? "member" : "members"}
                  {league.isCreator && " · Creator"}
                </span>
                <span className="league-card-rank">#{league.yourRank}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="friends-sheet-note">
        <Link to="/social" onClick={onNavigate}>
          Create or join a league on Social
        </Link>
      </p>
    </>
  );
}
