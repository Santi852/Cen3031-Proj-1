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

type Targets = Record<(typeof DIFFICULTIES)[number], number | null>;

type DifficultyRingProps = {
  counts: DifficultyCounts;
  // What a full ring means. Leave it out and the ring is just the split of
  // what was solved; pass a weekly goal and the unfilled part of the arc
  // shows how far there is to go.
  goal?: number;
  // Difficulty targets from the weekly goal (#91). When at least one is set,
  // the ring switches to "sections" mode, see buildSections.
  targets?: Targets;
};

// One stretch of the arc: `dash` long, starting `offset` along the circle.
type Segment = { key: string; className: string; dash: number; offset: number };

// How it draws: every segment is the same circle, drawn as one dash
// (stroke-dasharray = "dash length, then a gap as long as the whole circle")
// and slid along the circle with stroke-dashoffset so each one starts where
// the previous one ended.
function buildSegments(counts: DifficultyCounts, fullRing: number) {
  const solved = DIFFICULTIES.filter((d) => counts[d] > 0);
  const segments: Segment[] = [];
  let start = 0;
  for (const difficulty of solved) {
    const length = (counts[difficulty] / fullRing) * ARC;
    const isLast = difficulty === solved[solved.length - 1];
    segments.push({
      key: difficulty,
      className: `difficulty-ring-segment difficulty-ring-${difficulty}`,
      // Trim a gap off the end to separate it from the next color, unless
      // it's the last one (nothing follows it) or too short to spare it.
      dash: isLast ? length : Math.max(length - GAP, length / 2),
      offset: -start,
    });
    start += length;
  }
  return segments;
}

// Sections mode, for a goal with difficulty targets. The arc is split into
// one fixed section per target, sized by the target (2 Medium out of a goal of
// 5 = 2/5 of the arc). Each section is drawn twice: a dull "track" in its
// color for the whole section, then the bright color over the part you've
// done. If the targets add up to less than the total, the rest becomes an
// "any difficulty" section, filled by solves beyond the targets.
function buildSections(
  counts: DifficultyCounts,
  goal: number,
  targets: Targets,
) {
  const sections: { key: string; size: number; done: number }[] = [];
  let extraSolves = 0; // solves that don't go toward a target
  for (const d of DIFFICULTIES) {
    const target = targets[d];
    if (target === null) {
      extraSolves += counts[d];
    } else {
      sections.push({
        key: d,
        size: target,
        done: Math.min(counts[d], target),
      });
      extraSolves += Math.max(counts[d] - target, 0);
    }
  }
  const targeted = sections.reduce((sum, s) => sum + s.size, 0);
  const anySize = goal - targeted;
  if (anySize > 0) {
    sections.push({
      key: "any",
      size: anySize,
      done: Math.min(extraSolves, anySize),
    });
  }

  const segments: Segment[] = [];
  let start = 0;
  sections.forEach((section, i) => {
    const length = (section.size / goal) * ARC;
    const isLast = i === sections.length - 1;
    const dash = isLast ? length : Math.max(length - GAP, length / 2);
    segments.push({
      key: `${section.key}-track`,
      className: `difficulty-ring-section-track difficulty-ring-${section.key}`,
      dash,
      offset: -start,
    });
    if (section.done > 0) {
      segments.push({
        key: section.key,
        className: `difficulty-ring-segment difficulty-ring-${section.key}`,
        dash: (section.done / section.size) * dash,
        offset: -start,
      });
    }
    start += length;
  });
  return segments;
}

export default function DifficultyRing({
  counts,
  goal,
  targets,
}: DifficultyRingProps) {
  const total = counts.easy + counts.medium + counts.hard;
  const sectioned =
    goal !== undefined &&
    targets !== undefined &&
    DIFFICULTIES.some((d) => targets[d] !== null);
  // Never let the segments overflow the arc, even if the goal is beaten.
  const fullRing = Math.max(goal ?? total, total, 1);
  const segments = sectioned
    ? buildSections(counts, goal, targets)
    : buildSegments(counts, fullRing);

  return (
    <div className="difficulty-ring">
      {/* Decorative: the numbers are also in the list next to the ring and
          in the label below, so screen readers skip the drawing. */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {/* SVG circles start drawing at 3 o'clock. Rotating 135° moves the
            start to bottom-left, so the 90° gap ends up centered at the bottom. */}
        <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
          {/* Sections bring their own dull tracks, so the plain gray track
              only shows in the normal mode. */}
          {!sectioned && (
            <circle
              className="difficulty-ring-track"
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
            />
          )}
          {segments.map((s) => (
            <circle
              key={s.key}
              className={s.className}
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
        {/* Wrapped so "3/5" stays on one line; the label is a column. */}
        <span className="difficulty-ring-count">
          <span className="difficulty-ring-total">{total}</span>
          {goal !== undefined && (
            <span className="difficulty-ring-goal">/{goal}</span>
          )}
        </span>
        <span className="difficulty-ring-caption">Solved</span>
      </p>
    </div>
  );
}
