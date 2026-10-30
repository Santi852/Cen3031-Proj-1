import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { PauseIcon, PlayIcon } from "../components/icons";
import Loading from "../components/Loading";
import { useAutoAdvance } from "../components/useAutoAdvance";
import {
  getLeaderboard,
  type Leaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "../leetcode/leaderboardService";

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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
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
          <Carousel boards={state.boards} userId={userId} />
        )}
      </section>
      <LeaguesPlaceholder />
    </>
  );
}

// Leagues aren't in the backlog yet: they need new backend work (league
// tables, join codes, search), so this is a placeholder to show the layout
// when pitching them to the team. The buttons stay disabled until then.
function LeaguesPlaceholder() {
  return (
    <section className="leagues" aria-labelledby="leagues-title">
      <h2 id="leagues-title">Leagues</h2>
      <div className="leagues-actions">
        <button type="button" className="button button-primary" disabled>
          Create
        </button>
        <button type="button" className="button" disabled>
          Join with code
        </button>
        <button type="button" className="button" disabled>
          Search
        </button>
      </div>
      <p className="leagues-note">
        Coming soon: compete with friends in private leagues, with all-time
        points and weekly wins.
      </p>
    </section>
  );
}

function Carousel({
  boards,
  userId,
}: {
  boards: Leaderboard[];
  userId: string;
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
  position,
}: {
  board: Leaderboard;
  userId: string;
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
              <Row
                key={entry.userId}
                entry={entry}
                isYou={entry.userId === userId}
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

function Row({
  entry,
  isYou,
  afterGap,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  afterGap: boolean;
}) {
  const className = [
    "leaderboard-row",
    isYou && "is-you",
    afterGap && "after-gap",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // data-rank lets CSS style 1st, 2nd and 3rd: [data-rank="1"] { ... }
    // The highlight is only color, so aria-current tells screen readers.
    <li
      className={className}
      data-rank={entry.rank}
      aria-current={isYou ? "true" : undefined}
    >
      <span className="leaderboard-rank">{entry.rank}</span>
      <span className="leaderboard-player" title={entry.username}>
        {entry.username}
      </span>
      {isYou && <span className="you-pill">You</span>}
      <span className="leaderboard-points">{entry.points} pts</span>
    </li>
  );
}
