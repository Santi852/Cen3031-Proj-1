import { useId, type ReactNode } from "react";
import {
  BADGE_COLORS,
  describeBadge,
  type Badge,
  type BadgePattern,
} from "./badge";

// Draws a badge as SVG on a 24x24 grid: fill the square with the primary
// color, then paint the pattern's shapes on top in the secondary color.
// SVG scales cleanly, so the same component works at 32px in the top bar and
// 64px in the editor; size comes from CSS on .badge-icon.
// `decorative` hides it from screen readers when a label already says it.
export default function BadgeIcon({
  badge,
  decorative = false,
}: {
  badge: Badge;
  decorative?: boolean;
}) {
  // Each badge clips to its own rounded square. useId keeps the ids unique
  // when several badges are on screen (the editor shows 13 at once).
  const clipId = useId();
  const secondary = BADGE_COLORS[badge.secondary].hex;

  return (
    <svg
      className="badge-icon"
      viewBox="0 0 24 24"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": describeBadge(badge) })}
    >
      <clipPath id={clipId}>
        <rect width="24" height="24" rx="5" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="24" fill={BADGE_COLORS[badge.primary].hex} />
        <g fill={secondary} stroke={secondary}>
          {shapes(badge.pattern)}
        </g>
      </g>
    </svg>
  );
}

// Shapes inherit fill and stroke from the <g> above. Filled shapes set
// strokeWidth 0; line shapes set fill "none".
function shapes(pattern: BadgePattern): ReactNode {
  const box = (x: number, y: number, w: number, h: number) => (
    <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} strokeWidth={0} />
  );
  const line = (x1: number, y1: number, x2: number, y2: number, w: number) => (
    <line key={`${x1},${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={w} />
  );

  switch (pattern) {
    case "solid":
      return null;
    case "border":
      return (
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
          fill="none"
          strokeWidth={2}
        />
      );
    case "half-h":
      return box(0, 12, 24, 12);
    case "half-v":
      return box(12, 0, 12, 24);
    case "band-h":
      return box(0, 8, 24, 8);
    case "band-v":
      return box(8, 0, 8, 24);
    case "hoops": // five bands, secondary on the 2nd and 4th
      return [box(0, 4.8, 24, 4.8), box(0, 14.4, 24, 4.8)];
    case "stripes":
      return [box(4.8, 0, 4.8, 24), box(14.4, 0, 4.8, 24)];
    case "quarters":
      return [box(12, 0, 12, 12), box(0, 12, 12, 12)];
    case "checks": // 4x4 board, secondary where row + column is odd
      return [0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3]
          .filter((col) => (row + col) % 2 === 1)
          .map((col) => box(col * 6, row * 6, 6, 6)),
      );
    case "cross":
      return [box(9, 0, 6, 24), box(0, 9, 24, 6)];
    case "saltire":
      return [line(0, 0, 24, 24, 4), line(24, 0, 0, 24, 4)];
    case "sash":
      return line(0, 24, 24, 0, 7);
  }
}
