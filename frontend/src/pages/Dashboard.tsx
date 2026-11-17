import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ActivityCard from "../activity/ActivityCard";
import { useAuth } from "../auth/AuthContext";
import DifficultyBreakdown from "../components/DifficultyBreakdown";
import DifficultyRing from "../components/DifficultyRing";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import InfoTip from "../components/InfoTip";
import Loading from "../components/Loading";
import { goalProgress, progressMessage } from "../goals/goal";
import { useWeeklyGoal, type GoalState } from "../goals/useWeeklyGoal";
import { RefreshButton, SyncStatus } from "../components/RefreshButton";
import {
  getDashboard,
  type DashboardData,
  type DashboardRange,
} from "../leetcode/dashboardService";
import type { DifficultyCounts } from "../leetcode/linkService";
import { useSync } from "../leetcode/useSync";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "30d", label: "Last 30 days" },
];

// The outcome of one request. `key` says which request it answers, so the
// page can tell a fresh answer from one left over from the previous range.
type Result =
  { key: string; ok: true } | { key: string; ok: false; message: string };

export default function Dashboard() {
  const { user } = useAuth();
  // Loads on its own, so a slow or failed goal never blocks the stats.
  const { state: goalState } = useWeeklyGoal(user?.id);
  const [range, setRange] = useState<DashboardRange>("week");
  // Bumped to refetch the same range (after a sync, or on "Try again").
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // The last data that loaded. Kept while the next request runs, so switching
  // the range doesn't flash a spinner over the card.
  const [data, setData] = useState<DashboardData | null>(null);

  const key = `${range}:${reloads}`;
  const loading = result?.key !== key;

  useEffect(() => {
    const requestKey = `${range}:${reloads}`;
    // Ignore the answer if the user moved on (or left the page) before it
    // arrived; otherwise a slow "week" response could overwrite "30d".
    let cancelled = false;
    getDashboard(range).then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setResult({ key: requestKey, ok: true });
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
  }, [range, reloads]);

  const reload = () => setReloads((n) => n + 1);
  // Shared by the refresh icon (header) and the status line (footer).
  const sync = useSync(reload);

  let body;
  if (result && !result.ok && !loading) {
    body = <ErrorMessage message={result.message} onRetry={reload} />;
  } else if (!data) {
    body = <Loading label="Loading your stats…" />;
  } else if (!data.leetcode.linked) {
    body = (
      <EmptyState
        title="Connect LeetCode to see your stats"
        message="Link your LeetCode account and your solved problems will show up here."
        action={
          <Link to="/link-account" className="button button-primary">
            Link LeetCode
          </Link>
        }
      />
    );
  } else {
    const { username, counts } = data.leetcode;
    const total = counts.easy + counts.medium + counts.hard;
    // The goal is weekly, so it only applies to the "This week" range.
    const goal =
      range === "week" && goalState.status === "ready" ? goalState.goal : null;

    body = (
      <>
        {/* First: "did I show up this week" is the quick daily check. It's
            always this week, so it ignores the range toggle below. */}
        <ActivityCard reloadKey={reloads} />
        <section
          className="dashboard-card"
          aria-labelledby="leetcode-card-title"
          aria-busy={loading}
        >
          <header className="dashboard-card-header">
            <div>
              <h3 id="leetcode-card-title">LeetCode solves</h3>
              <p className="dashboard-card-subtitle">
                {/* Its own element so CSS can shorten a long name with "…";
                  title shows the full name on hover. */}
                <span className="dashboard-card-username" title={username}>
                  {username}
                </span>
              </p>
            </div>
            <div className="dashboard-card-actions">
              <RefreshButton sync={sync} />
              {/* The range filters everything in the card, so it sits at the
                top. aria-pressed tells screen readers which one is selected. */}
              <div
                className="range-toggle"
                role="group"
                aria-label="Time range"
              >
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className="range-toggle-option"
                    aria-pressed={range === r.value}
                    onClick={() => setRange(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <InfoTip label="About LeetCode solves">
                <p>
                  Problems you solved for the first time on LeetCode in the
                  selected range, split by difficulty. Solving one again doesn't
                  count twice.
                </p>
                <p>
                  <strong>This week</strong> starts Monday 00:00 UTC, the same
                  week as the leaderboard.
                </p>
                <p>
                  Refresh pulls in your latest solves, once every 15 minutes.
                  Each refresh reads your 20 most recent accepted submissions,
                  so refresh often on busy days.
                </p>
                <p>
                  With a weekly goal, the ring fills toward it. Set it in
                  Profile.
                </p>
              </InfoTip>
            </div>
          </header>

          {/* With a goal, zero solves still shows the empty ring (0/5), which
            says more than "no solves yet". */}
          {total === 0 && !goal ? (
            <EmptyState
              title={`No solves ${range === "week" ? "this week" : "in the last 30 days"} yet`}
              message="Solve a problem on LeetCode, then hit Refresh."
            />
          ) : (
            // The ring's center shows the total, so no separate total line.
            <div className="dashboard-breakdown">
              <DifficultyRing
                counts={counts}
                goal={goal?.total}
                targets={goal ?? undefined}
              />
              <DifficultyBreakdown
                counts={counts}
                targets={goal ?? undefined}
              />
            </div>
          )}

          {range === "week" && <GoalStatus state={goalState} counts={counts} />}

          {/* "Last synced" is good-to-know, not something to act on, so it
            sits quietly at the bottom of the card. */}
          <footer className="dashboard-card-footer">
            <SyncStatus sync={sync} />
          </footer>
        </section>
      </>
    );
  }

  return (
    <section>
      {/* The nav already shows where you are, so the title is hidden on
          screen. Screen readers still use it to understand the page. */}
      <h2 className="visually-hidden">Dashboard</h2>
      {body}
    </section>
  );
}

// One line under the ring about the weekly goal (#91).
function GoalStatus({
  state,
  counts,
}: {
  state: GoalState;
  counts: DifficultyCounts;
}) {
  // Nothing while loading: the line popping in is calmer than a spinner.
  if (state.status === "loading") return null;
  if (state.status === "error") {
    return <p className="goal-status">Couldn't load your weekly goal.</p>;
  }
  if (!state.goal) {
    return (
      <div className="goal-cta">
        <Link to="/profile#weekly-goal" className="button button-secondary">
          Set a weekly goal
        </Link>
      </div>
    );
  }
  const progress = goalProgress(state.goal, counts);
  return (
    <div className={`goal-status${progress.reached ? " is-reached" : ""}`}>
      {/* aria-live so a screen reader hears "goal reached" after a refresh. */}
      <p aria-live="polite">{progressMessage(progress)}</p>
      {/* Opens the same form as Profile, so there's only one goal form. */}
      <Link
        to="/profile#weekly-goal"
        className="button button-secondary goal-edit"
      >
        Edit goal
      </Link>
    </div>
  );
}
