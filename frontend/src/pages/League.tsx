import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMyBadge } from "../badge/useMyBadge";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LeaderboardRow from "../components/LeaderboardRow";
import { SettingsIcon } from "../components/icons";
import Loading from "../components/Loading";
import LeagueSettings from "../leagues/LeagueSettings";
import { getLeague, LeagueError, type League } from "../leagues/leagueService";

type State =
  | { status: "loading" }
  | { status: "missing" } // bad link, or you left / were never in it
  | { status: "error"; message: string }
  | { status: "ready"; league: League };

// One league (2-13), as two cards: the header (name and the settings gear)
// and the weekly board. The code, New code and Leave live in LeagueSettings.
export default function LeaguePage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { badge: myBadge } = useMyBadge(user?.id);
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloads, setReloads] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getLeague(user, id).then(
      (league) => {
        if (!cancelled) setState({ status: "ready", league });
      },
      (err: unknown) => {
        if (cancelled) return;
        // "Not a member" is a normal answer (an old link), not a failure,
        // so it gets an empty state instead of a red error with Try again.
        setState(
          err instanceof LeagueError
            ? { status: "missing" }
            : {
                status: "error",
                message:
                  err instanceof Error ? err.message : "Something went wrong.",
              },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, id, reloads]);

  const retry = () => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  };

  return (
    <section className="league" aria-labelledby="league-title">
      <Link to="/social" className="back-link">
        ← Social
      </Link>
      {state.status === "loading" && <Loading label="Loading the league…" />}
      {state.status === "error" && (
        <ErrorMessage message={state.message} onRetry={retry} />
      )}
      {state.status === "missing" && (
        <EmptyState
          title="League not found"
          message="It may not exist, or you're not a member. Ask for a join code."
          action={
            <Link to="/social" className="button button-primary">
              Back to Social
            </Link>
          }
        />
      )}
      {state.status === "ready" && user && (
        <>
          <header className="league-header">
            <div className="league-header-text">
              <h2 id="league-title">{state.league.name}</h2>
              <p className="league-meta">
                {state.league.members.length}{" "}
                {state.league.members.length === 1 ? "member" : "members"} ·
                This week
              </p>
            </div>
            <div className="league-header-actions">
              <button
                type="button"
                className="icon-button"
                aria-label="League settings"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon />
              </button>
            </div>
          </header>

          <div className="league-board">
            {/* Leagues are small, so every member is shown, not just the top 4. */}
            <ol className="leaderboard-list">
              {state.league.members.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isYou={entry.userId === user.id}
                  myBadge={myBadge}
                />
              ))}
            </ol>
            {state.league.members.length === 1 && (
              // With the code tucked behind the gear, a brand-new league
              // points you to it, since an empty league is the one moment
              // you really need the code.
              <p className="league-note">
                It's just you so far.{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSettingsOpen(true)}
                >
                  Invite friends
                </button>
              </p>
            )}
          </div>

          {settingsOpen && (
            <LeagueSettings
              league={state.league}
              onRegenerated={(joinCode) =>
                setState({
                  status: "ready",
                  league: { ...state.league, joinCode },
                })
              }
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
