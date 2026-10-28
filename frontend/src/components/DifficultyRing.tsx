import type { DifficultyCounts } from "../leetcode/linkService";

// Ring geometry, in SVG units (the viewBox is 120 x 120).
const SIZE = 120;
const CENTER = SIZE / 2;
const STROKE = 8;
const RADIUS = CENTER - STROKE; // keep the stroke inside the box
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// The ring is a 270° arc with the gap at the bottom, like a gauge.
const ARC = CIRCUMFERENCE * 0.75;
// Space between two segments, so the colors don't touch.
const GAP = 3;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

type DifficultyRingProps = {
  counts: DifficultyCounts;
  // What a full ring means. Leave it out and the ring is just the split of
  // what was solved; pass a weekly goal later and the unfilled part of the
  // arc shows how far there is to go.
  goal?: number;
};

// How it draws: every segment is the same circle, drawn as one dash
// (stroke-dasharray = "dash length, then a gap as long as the whole circle")
// and slid along the circle with stroke-dashoffset so each one starts where
// the previous one ended.
function buildSegments(counts: DifficultyCounts, fullRing: number) {
  const solved = DIFFICULTIES.filter((d) => counts[d] > 0);
  const segments = [];
  let start = 0;
  for (const difficulty of solved) {
    const length = (counts[difficulty] / fullRing) * ARC;
    const isLast = difficulty === solved[solved.length - 1];
    segments.push({
      difficulty,
      // Trim a gap off the end to separate it from the next color, unless
      // it's the last one (nothing follows it) or too short to spare it.
      dash: isLast ? length : Math.max(length - GAP, length / 2),
      offset: -start,
    });
    start += length;
  }
  return segments;
}

export default function DifficultyRing({ counts, goal }: DifficultyRingProps) {
  const total = counts.easy + counts.medium + counts.hard;
  // Never let the segments overflow the arc, even if the goal is beaten.
  const fullRing = Math.max(goal ?? total, total, 1);
  const segments = buildSegments(counts, fullRing);

  return (
    <div className="difficulty-ring">
      {/* Decorative: the numbers are also in the list next to the ring and
          in the label below, so screen readers skip the drawing. */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {/* SVG circles start drawing at 3 o'clock. Rotating 135° moves the
            start to bottom-left, so the 90° gap ends up centered at the bottom. */}
        <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
          <circle
            className="difficulty-ring-track"
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          />
          {segments.map((s) => (
            <circle
              key={s.difficulty}
              className={`difficulty-ring-segment difficulty-ring-${s.difficulty}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${CIRCUMFERENCE}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
      </svg>
      <p className="difficulty-ring-label">
        <span className="difficulty-ring-total">{total}</span>
        {goal !== undefined && (
          <span className="difficulty-ring-goal">/{goal}</span>
        )}
        <span className="difficulty-ring-caption">Solved</span>
      </p>
    </div>
  );
}
