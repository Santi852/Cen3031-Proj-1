import { DEFAULT_BADGE, isBadge, type Badge } from "../badge/badge";
import BadgeIcon from "../badge/BadgeIcon";
import type { LeaderboardEntry } from "../leetcode/leaderboardService";

// One ranked row, shared by the global board and every league board so they
// look and behave the same.
export default function LeaderboardRow({
  entry,
  isYou,
  myBadge,
  afterGap = false,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  myBadge: Badge;
  afterGap?: boolean;
}) {
  // Your row shows the badge you just saved, even before the server knows
  // it. Others use what the API sends, checked like any outside data.
  const badge = isYou
    ? myBadge
    : isBadge(entry.badge)
      ? entry.badge
      : DEFAULT_BADGE;
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
      {/* Decorative: the name next to it already says who this is. */}
      <BadgeIcon badge={badge} decorative />
      <span className="leaderboard-player" title={entry.username}>
        {entry.username}
      </span>
      <span className="leaderboard-points">{entry.points} pts</span>
    </li>
  );
}
