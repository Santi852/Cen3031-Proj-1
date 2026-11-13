import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { Badge } from "../badge/badge";
import { useMyBadge } from "../badge/useMyBadge";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LeaderboardRow from "../components/LeaderboardRow";
import { PauseIcon, PlayIcon } from "../components/icons";
import Loading from "../components/Loading";
import { useAutoAdvance } from "../components/useAutoAdvance";
import {
  getLeaderboard,
  type Leaderboard,
  type LeaderboardPeriod,
} from "../leetcode/leaderboardService";
import MyLeagues from "../leagues/MyLeagues";

// Slide order. The API only has the weekly board so far. When monthly and
// all-time exist, add them back above it: { value: "all", label: "All time",
// empty: "No scores yet" } and { value: "month", label: "This month", empty:
// "No scores this month yet" }. All time goes first, so it's the board you see
// when the page opens.
const PERIODS: { value: LeaderboardPeriod; label: string; empty: string }[] = [
  { value: "week", label: "This week", empty: "No scores this week yet" },
];

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; boards: Leaderboard[] };

// The Social tab (#93): the global board on top, then your leagues (2-13).
// Friends come later.
export default function SocialPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  // Badges aren't on the server yet, so your own comes from this browser.
  const { badge: myBadge } = useMyBadge(user?.id);
  // Bumped by "Try again" to refetch.
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    // Ignore the answer if the user left the page before it arrived.
    let cancelled = false;
    Promise.all(PERIODS.map((p) => getLeaderboard(p.value))).then(
      (boards) => {
        if (!cancelled) setState({ status: "ready", boards });
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
  }, [reloads]);

  const retry = () => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  };

  return (
    <>
      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <header className="leaderboard-header">
          <h2 id="leaderboard-title">Global</h2>
        </header>
        {state.status === "loading" && (
          <Loading label="Loading the leaderboard…" />
        )}
        {state.status === "error" && (
          <ErrorMessage message={state.message} onRetry={retry} />
        )}
        {state.status === "ready" && (
          <Carousel boards={state.boards} userId={userId} myBadge={myBadge} />
        )}
      </section>
      <MyLeagues />
    </>
  );
}

function Carousel({
  boards,
  userId,
  myBadge,
}: {
  boards: Leaderboard[];
  userId: string;
  myBadge: Badge;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { index, goTo, paused, togglePaused } = useAutoAdvance(
    trackRef,
    boards.length,
  );

  return (
    <div className="leaderboard-carousel">
      {/* The track scrolls sideways and CSS scroll-snap makes it stop on
          each slide. tabIndex lets keyboard users focus it and use the
          arrow keys to scroll. */}
      <div
        ref={trackRef}
        className="leaderboard-track"
        tabIndex={0}
        aria-label="Leaderboards"
      >
        {boards.map((board, i) => (
          <Slide
            key={board.period}
            board={board}
            userId={userId}
            myBadge={myBadge}
            position={`${i + 1} of ${boards.length}`}
          />
        ))}
      </div>

      {boards.length > 1 && (
        <div className="leaderboard-controls">
          <div className="leaderboard-dots">
            {PERIODS.map((p, i) => (
              <button
                key={p.value}
                type="button"
                className="leaderboard-dot"
                aria-label={`Show ${p.label}`}
                aria-current={index === i ? "true" : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={paused ? "Resume auto-scroll" : "Pause auto-scroll"}
            onClick={togglePaused}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        </div>
      )}
    </div>
  );
}

function Slide({
  board,
  userId,
  myBadge,
  position,
}: {
  board: Leaderboard;
  userId: string;
  myBadge: Badge;
  position: string;
}) {
  const period = PERIODS.find((p) => p.value === board.period)!;
  const { top, you } = board;

  // Always the top 3, then one more row: your own spot if you're below the
  // top 3, otherwise 4th place so the board still has four rows. This checks
  // the rows, not your rank: when many people tie (everyone has 0 at the start
  // of a week) you can be ranked 1st without being one of the first three.
  const youInTop3 =
    you !== null && top.slice(0, 3).some((e) => e.userId === you.userId);
  const fourth = you && !youInTop3 ? you : top[3];
  const rows = fourth ? [...top.slice(0, 3), fourth] : top.slice(0, 3);

  return (
    <article
      className="leaderboard-slide"
      aria-roledescription="slide"
      aria-label={`${period.label}, ${position}`}
    >
      <h3>{period.label}</h3>
      {top.length === 0 ? (
        <EmptyState
          title={period.empty}
          message="Solve a problem on LeetCode and sync to get on the board."
        />
      ) : (
        <>
          <ol className="leaderboard-list">
            {rows.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isYou={entry.userId === userId}
                myBadge={myBadge}
                // Your row when you're far down (e.g. 12th) gets a gap
                // above it, so it doesn't read as if you're 4th.
                afterGap={entry.rank > 4}
              />
            ))}
          </ol>
          {you === null && (
            <p className="leaderboard-note">
              <Link to="/link-account">Link your LeetCode account</Link> to get
              on the board.
            </p>
          )}
        </>
      )}
    </article>
  );
}
