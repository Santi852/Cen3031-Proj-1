import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { Badge } from "../badge/badge";
import { useMyBadge } from "../badge/useMyBadge";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LeaderboardRow from "../components/LeaderboardRow";
import { boardRows } from "../components/boardRows";
import { PauseIcon, PlayIcon } from "../components/icons";
import Loading from "../components/Loading";
import { useAutoAdvance } from "../components/useAutoAdvance";
import { getFriendsBoard } from "../friends/friendService";
import { openFriends } from "../friends/openFriends";
import PlayerSheet from "../friends/PlayerSheet";
import { FOLLOWING_CHANGED } from "../friends/useFollowing";
import {
  getLeaderboard,
  type Leaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "../leetcode/leaderboardService";
import MyLeagues from "../leagues/MyLeagues";

// Global slide order. The API only has the weekly board so far. When monthly
// and all-time exist, add them back above it: { value: "all", label: "All
// time", empty: "No scores yet" } and { value: "month", label: "This month",
// empty: "No scores this month yet" }. All time goes first, so it's the board
// you see when the page opens.
const PERIODS: { value: LeaderboardPeriod; label: string; empty: string }[] = [
  { value: "week", label: "This week", empty: "No scores this week yet" },
];

// One carousel slide. Each carries its own title and empty message, since
// the Friends slide isn't a time period.
type SlideData = {
  key: string;
  label: string;
  board: Leaderboard;
  // Shown instead of the rows when there's nobody to rank.
  empty: { title: string; message: string; action?: ReactNode } | null;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; slides: SlideData[] };

// The Social tab (#93): the boards on top (global, then friends), then your
// leagues (2-13). Following lives in the Friends sheet in the top bar.
export default function SocialPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  // Badges aren't on the server yet, so your own comes from this browser.
  const { badge: myBadge } = useMyBadge(user?.id);
  // Bumped by "Try again", and after a follow or unfollow, to refetch.
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  // The player whose name was tapped, for the Follow sheet.
  const [player, setPlayer] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    // Ignore the answer if the user left the page before it arrived.
    let cancelled = false;
    Promise.all([
      Promise.all(PERIODS.map((p) => getLeaderboard(p.value))),
      // A broken friends board shouldn't hide the global one.
      getFriendsBoard(user).catch(() => null),
    ]).then(
      ([boards, friendsBoard]) => {
        if (cancelled) return;
        const slides: SlideData[] = boards.map((board, i) => ({
          key: PERIODS[i].value,
          label: PERIODS[i].label,
          board,
          empty:
            board.top.length === 0
              ? {
                  title: PERIODS[i].empty,
                  message:
                    "Solve a problem on LeetCode and sync to get on the board.",
                }
              : null,
        }));
        if (friendsBoard) {
          const followsAnyone = friendsBoard.top.some(
            (e) => e.userId !== user.id,
          );
          slides.push({
            key: "friends",
            label: "Friends this week",
            board: friendsBoard,
            empty: followsAnyone
              ? null
              : {
                  title: "No friends here yet",
                  message:
                    "Follow people, or tap a name on another board, to compete with them here.",
                  action: (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => openFriends()}
                    >
                      Find friends
                    </button>
                  ),
                },
          });
        }
        setState({ status: "ready", slides });
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

  // Following someone changes the Friends slide, so refetch quietly (no
  // spinner; the old boards stay up until the new ones arrive).
  useEffect(() => {
    const refetch = () => setReloads((n) => n + 1);
    window.addEventListener(FOLLOWING_CHANGED, refetch);
    return () => window.removeEventListener(FOLLOWING_CHANGED, refetch);
  }, []);

  const retry = () => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  };

  return (
    <>
      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <header className="leaderboard-header">
          <h2 id="leaderboard-title">Leaderboards</h2>
        </header>
        {state.status === "loading" && (
          <Loading label="Loading the leaderboard…" />
        )}
        {state.status === "error" && (
          <ErrorMessage message={state.message} onRetry={retry} />
        )}
        {state.status === "ready" && (
          <Carousel
            slides={state.slides}
            userId={userId}
            myBadge={myBadge}
            onPlayerClick={setPlayer}
          />
        )}
      </section>
      <MyLeagues />
      {player && (
        <PlayerSheet player={player} onClose={() => setPlayer(null)} />
      )}
    </>
  );
}

function Carousel({
  slides,
  userId,
  myBadge,
  onPlayerClick,
}: {
  slides: SlideData[];
  userId: string;
  myBadge: Badge;
  onPlayerClick: (entry: LeaderboardEntry) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { index, goTo, paused, togglePaused } = useAutoAdvance(
    trackRef,
    slides.length,
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
        {slides.map((slide, i) => (
          <Slide
            key={slide.key}
            slide={slide}
            userId={userId}
            myBadge={myBadge}
            position={`${i + 1} of ${slides.length}`}
            onPlayerClick={onPlayerClick}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="leaderboard-controls">
          <div className="leaderboard-dots">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className="leaderboard-dot"
                aria-label={`Show ${s.label}`}
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
  slide,
  userId,
  myBadge,
  position,
  onPlayerClick,
}: {
  slide: SlideData;
  userId: string;
  myBadge: Badge;
  position: string;
  onPlayerClick: (entry: LeaderboardEntry) => void;
}) {
  const { top, you } = slide.board;

  // Top 3 plus your spot (or 4th), see boardRows.
  const rows = boardRows(top, you);

  return (
    <article
      className="leaderboard-slide"
      aria-roledescription="slide"
      aria-label={`${slide.label}, ${position}`}
    >
      <h3>{slide.label}</h3>
      {slide.empty ? (
        <EmptyState
          title={slide.empty.title}
          message={slide.empty.message}
          action={slide.empty.action}
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
                onPlayerClick={onPlayerClick}
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
