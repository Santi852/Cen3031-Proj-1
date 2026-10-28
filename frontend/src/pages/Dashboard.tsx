import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DifficultyBreakdown from "../components/DifficultyBreakdown";
import DifficultyRing from "../components/DifficultyRing";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import Loading from "../components/Loading";
import { RefreshButton, SyncStatus } from "../components/RefreshButton";
import {
  getDashboard,
  IS_DEMO,
  type DashboardData,
  type DashboardRange,
} from "../leetcode/dashboardService";
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

    body = (
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
              {IS_DEMO && (
                <span
                  className="demo-badge"
                  title="Sample data until the dashboard API (1-12) is ready"
                >
                  Demo data
                </span>
              )}
            </p>
          </div>
          <div className="dashboard-card-actions">
            <RefreshButton sync={sync} />
            {/* The range filters everything in the card, so it sits at the
                top. aria-pressed tells screen readers which one is selected. */}
            <div className="range-toggle" role="group" aria-label="Time range">
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
          </div>
        </header>

        {total === 0 ? (
          <EmptyState
            title={`No solves ${range === "week" ? "this week" : "in the last 30 days"} yet`}
            message="Solve a problem on LeetCode, then hit Refresh."
          />
        ) : (
          // The ring's center shows the total, so no separate total line.
          <div className="dashboard-breakdown">
            <DifficultyRing counts={counts} />
            <DifficultyBreakdown counts={counts} />
          </div>
        )}

        {/* "Last synced" is good-to-know, not something to act on, so it
            sits quietly at the bottom of the card. */}
        <footer className="dashboard-card-footer">
          <SyncStatus sync={sync} />
        </footer>
      </section>
    );
  }

  return (
    <section>
      <h2>Dashboard</h2>
      {body}
    </section>
  );
}
