import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";
import LeagueSheet from "./LeagueSheet";
import { getMyLeagues, type LeagueSummary } from "./leagueService";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; leagues: LeagueSummary[] };

// "My leagues" on the Social tab: Create and Join up top, then one card per
// league linking to its page.
export default function MyLeagues() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [sheet, setSheet] = useState<"create" | "join" | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyLeagues(user).then(
      (leagues) => {
        if (!cancelled) setState({ status: "ready", leagues });
      },
      (err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, reloads]);

  const retry = () => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  };

  return (
    <section className="leagues" aria-labelledby="leagues-title">
      <header className="leagues-header">
        <h2 id="leagues-title">Leagues</h2>
        <div className="leagues-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setSheet("create")}
          >
            Create
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setSheet("join")}
          >
            Join with code
          </button>
        </div>
      </header>

      {state.status === "loading" && <Loading label="Loading your leagues…" />}
      {state.status === "error" && (
        <ErrorMessage message={state.message} onRetry={retry} />
      )}
      {state.status === "ready" &&
        (state.leagues.length === 0 ? (
          <EmptyState
            title="No leagues yet"
            message="Create one and share the code, or join a friend's with theirs."
          />
        ) : (
          <ul className="league-list">
            {state.leagues.map((league) => (
              <li key={league.id}>
                {/* The whole card is the link, like the post cards. */}
                <Link
                  to={`/social/leagues/${league.id}`}
                  className="league-card"
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
        ))}

      {sheet && <LeagueSheet mode={sheet} onClose={() => setSheet(null)} />}
    </section>
  );
}
