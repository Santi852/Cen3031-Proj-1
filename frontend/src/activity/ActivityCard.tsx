import { useEffect, useState } from "react";
import ErrorMessage from "../components/ErrorMessage";
import { FlameIcon } from "../components/icons";
import InfoTip from "../components/InfoTip";
import Loading from "../components/Loading";
import FriendStreaks from "./FriendStreaks";
import type { ActivityDay, DateKey } from "./activity";
import { getActivity, type ActivityData } from "./activityService";

type ActivityCardProps = {
  // Changes whenever the dashboard reloads (after a sync), so this card
  // refetches too.
  reloadKey: number;
};

// This week's activity strip and streaks (#92). Its own card with its own
// loading and error states, so a failure here never hides the solve counts.
export default function ActivityCard({ reloadKey }: ActivityCardProps) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  // "You" = your week and streaks, "Friends" = streak board with friends.
  const [view, setView] = useState<"you" | "friends">("you");

  useEffect(() => {
    let cancelled = false;
    getActivity().then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey, retries]);

  let body;
  if (error) {
    // Say it failed instead of showing an empty strip, which would look like
    // a week with no solves.
    body = (
      <ErrorMessage message={error} onRetry={() => setRetries((n) => n + 1)} />
    );
  } else if (!data) {
    body = <Loading label="Loading your activity…" />;
  } else if (data.trackedSince === null) {
    body = (
      <p className="activity-note">
        Your activity shows up here after your first sync.
      </p>
    );
  } else {
    const { today, trackedSince } = data;
    const todayCount = data.days.find((d) => d.date === today)?.count ?? 0;
    body = (
      <>
        <ol className="activity-strip">
          {data.days.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              state={
                day.date > today
                  ? "upcoming"
                  : day.date < trackedSince
                    ? "untracked"
                    : day.date === today
                      ? "today"
                      : "past"
              }
            />
          ))}
        </ol>

        <dl className="activity-streaks">
          <Streak label="Day streak" value={data.dailyStreak} unit="day" />
          <Streak label="Week streak" value={data.weeklyStreak} unit="week" />
        </dl>

        {/* A nudge only when there's a streak to lose today. */}
        {data.dailyStreak > 0 && todayCount === 0 && (
          <p className="activity-note">Solve one today to keep your streak.</p>
        )}
      </>
    );
  }

  return (
    <section
      className="dashboard-card activity-card"
      aria-labelledby="activity-card-title"
    >
      {/* One row: title, then the toggle right next to it, then "?" at the
          far right. */}
      <header className="dashboard-card-header activity-card-header">
        <div>
          <h3 id="activity-card-title">Activity</h3>
          <p className="dashboard-card-subtitle">
            {view === "you" ? "This week" : "Day streaks"}
          </p>
        </div>
        {/* Same pill toggle as the range on the LeetCode card, smaller. */}
        <div
          className="range-toggle activity-view-toggle"
          role="group"
          aria-label="Show"
        >
          <button
            type="button"
            className="range-toggle-option"
            aria-pressed={view === "you"}
            onClick={() => setView("you")}
          >
            You
          </button>
          <button
            type="button"
            className="range-toggle-option"
            aria-pressed={view === "friends"}
            onClick={() => setView("friends")}
          >
            Friends
          </button>
        </div>
        <InfoTip label="About activity">
          <p>
            Each square is a day this week, Monday to Sunday, with the number of
            problems you solved for the first time that day.
          </p>
          <p>
            <strong>Day streak:</strong> days in a row with at least one solve.
            <br />
            <strong>Week streak:</strong> weeks in a row with at least one
            solve.
          </p>
          <p>Today and this week don't break a streak until they're over.</p>
          <p>
            <strong>Friends</strong> ranks you and the people you follow by day
            streak. Equal streaks share a rank, like the leaderboard.
          </p>
          {/* The issue asks us not to pass this off as lifetime history. */}
          {data?.trackedSince && (
            <p>
              Counts solves we've seen since{" "}
              {formatDay(data.trackedSince, "long")}.
            </p>
          )}
        </InfoTip>
      </header>
      {view === "you" ? body : <FriendStreaks reloadKey={reloadKey} />}
    </section>
  );
}

function Streak({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    // is-lit colors the flame while the streak is alive; a 0 streak shows a
    // gray one, so the tile doesn't look broken.
    <div className={`activity-streak${value > 0 ? " is-lit" : ""}`}>
      <dt>{label}</dt>
      <dd>
        <span className="activity-flame">
          <FlameIcon />
        </span>
        {value}
        <span className="activity-streak-unit">
          {/* No leading space: the flex gap spaces it. */}
          {`${unit}${value === 1 ? "" : "s"}`}
        </span>
      </dd>
    </div>
  );
}

type DayState = "past" | "today" | "upcoming" | "untracked";

// How strong a day's color is, for CSS: 0 none, 1 one solve, 2 two or three,
// 3 four or more.
function level(count: number): number {
  return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
}

function DayCell({ day, state }: { day: ActivityDay; state: DayState }) {
  const known = state === "past" || state === "today";
  // What a screen reader hears for the day, since the square is visual only.
  const status =
    state === "upcoming"
      ? "upcoming"
      : state === "untracked"
        ? "not tracked yet"
        : day.count > 0
          ? `${day.count} solved`
          : state === "today"
            ? "no solves yet"
            : "no solves";

  return (
    <li
      className={`activity-day${state === "today" ? " is-today" : ""}`}
      data-level={known ? level(day.count) : state}
    >
      <span className="activity-cell" aria-hidden="true">
        {known && day.count > 0 ? day.count : ""}
      </span>
      <span className="activity-weekday" aria-hidden="true">
        {formatDay(day.date, "short")}
      </span>
      <span className="visually-hidden">
        {state === "today" ? "Today, " : ""}
        {formatDay(day.date, "long")}: {status}
      </span>
    </li>
  );
}

// A DateKey is a calendar day, so format it in UTC; using the local timezone
// could shift it to the day before.
function formatDay(key: DateKey, style: "short" | "long"): string {
  return new Intl.DateTimeFormat(
    undefined,
    style === "short"
      ? { weekday: "short", timeZone: "UTC" }
      : { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" },
  ).format(new Date(`${key}T00:00:00Z`));
}
