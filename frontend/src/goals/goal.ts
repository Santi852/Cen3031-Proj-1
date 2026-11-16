import type { DifficultyCounts } from "../leetcode/linkService";

// Weekly goal rules (#91). Written down here so the UI, the stub and Matias's
// API all agree:
// - The week is the same one scoring and the leaderboard use: Monday 00:00 UTC
//   through Sunday 23:59:59 UTC. Progress is the dashboard's "This week" count.
// - One goal per user, not one per week. Editing it changes the target for the
//   current week right away; past weeks aren't stored or judged.
// - `total` is required. Difficulty targets are optional "at least N" targets
//   inside the total (e.g. 5 total, at least 2 Medium), so they can't add up to
//   more than the total.
// - The goal is reached when the total AND every difficulty target are met.
//   Going over is fine: the ring stays full and the label shows e.g. 7/5.

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const GOAL_MAX = 100;

export type WeeklyGoal = {
  total: number;
  // null = no target for that difficulty.
  easy: number | null;
  medium: number | null;
  hard: number | null;
};

// ---- Validation ------------------------------------------------------------

// What the form holds: raw text from the inputs, "" meaning empty.
export type GoalDraft = Record<"total" | Difficulty, string>;

export type GoalErrors = Partial<Record<keyof GoalDraft | "form", string>>;

export function draftFromGoal(goal: WeeklyGoal | null): GoalDraft {
  const text = (n: number | null | undefined) => (n == null ? "" : String(n));
  return {
    total: text(goal?.total),
    easy: text(goal?.easy),
    medium: text(goal?.medium),
    hard: text(goal?.hard),
  };
}

// Whole numbers only. "3.5", "-1", "1e2" and "abc" are all rejected.
function parseCount(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

// When the difficulty targets add up to more than the total, raise the total
// to match instead of complaining: typing "3 Medium" clearly means "at least
// 3 a week". Lowering the total by hand is still checked by parseGoal.
export function coverTargets(draft: GoalDraft): GoalDraft {
  const sum = DIFFICULTIES.reduce(
    (acc, d) => acc + (parseCount(draft[d]) ?? 0),
    0,
  );
  const total = parseCount(draft.total);
  return sum > 0 && (total === null || total < sum)
    ? { ...draft, total: String(sum) }
    : draft;
}

// Turns the form into a goal, or explains every problem at once so the user
// can fix them all in one go.
export function parseGoal(
  draft: GoalDraft,
): { ok: true; goal: WeeklyGoal } | { ok: false; errors: GoalErrors } {
  const errors: GoalErrors = {};

  const total = parseCount(draft.total);
  if (draft.total.trim() === "") {
    errors.total = "Enter how many problems you want to solve.";
  } else if (total === null) {
    errors.total = "Use a whole number.";
  } else if (total < 1 || total > GOAL_MAX) {
    errors.total = `Pick a number from 1 to ${GOAL_MAX}.`;
  }

  const targets = { easy: null, medium: null, hard: null } as Pick<
    WeeklyGoal,
    Difficulty
  >;
  for (const d of DIFFICULTIES) {
    if (draft[d].trim() === "") continue; // optional
    const value = parseCount(draft[d]);
    if (value === null) errors[d] = "Use a whole number.";
    else if (value > GOAL_MAX) errors[d] = `${GOAL_MAX} at most.`;
    else targets[d] = value === 0 ? null : value; // 0 means "no target"
  }

  const sum = DIFFICULTIES.reduce((acc, d) => acc + (targets[d] ?? 0), 0);
  // Raising a target bumps the total up automatically (see coverTargets), so
  // this only happens when the total itself was lowered below the targets.
  if (total !== null && !errors.total && sum > total) {
    errors.total = `Your difficulty targets add up to ${sum}, so this needs to be at least ${sum}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, goal: { total: total!, ...targets } };
}

// Checks data coming back from storage or the API.
export function isWeeklyGoal(value: unknown): value is WeeklyGoal {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const isCount = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= GOAL_MAX;
  return (
    isCount(v.total) &&
    (v.total as number) >= 1 &&
    DIFFICULTIES.every((d) => v[d] === null || isCount(v[d]))
  );
}

// ---- Progress --------------------------------------------------------------

export type GoalProgress = {
  solved: number;
  // Problems still needed for the total (0 once it's met).
  remaining: number;
  // Difficulty targets not met yet, and how many each still needs.
  missing: { difficulty: Difficulty; remaining: number }[];
  reached: boolean;
};

export function goalProgress(
  goal: WeeklyGoal,
  counts: DifficultyCounts,
): GoalProgress {
  const solved = counts.easy + counts.medium + counts.hard;
  const missing = DIFFICULTIES.flatMap((difficulty) => {
    const target = goal[difficulty];
    const short = target === null ? 0 : target - counts[difficulty];
    return short > 0 ? [{ difficulty, remaining: short }] : [];
  });
  const remaining = Math.max(goal.total - solved, 0);
  return {
    solved,
    remaining,
    missing,
    reached: remaining === 0 && missing.length === 0,
  };
}

// One short sentence for under the ring.
export function progressMessage(progress: GoalProgress): string {
  if (progress.reached) return "Weekly goal reached. Nice work!";
  if (progress.remaining > 0 && progress.missing.length === 0) {
    return `${progress.remaining} more to reach your weekly goal.`;
  }
  // Some difficulty is short. Name them: "1 more Medium and 2 more Hard".
  const parts = progress.missing.map(
    (m) => `${m.remaining} more ${DIFFICULTY_LABELS[m.difficulty]}`,
  );
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
      : parts[0];
  const shortOnTargets = progress.missing.reduce((a, m) => a + m.remaining, 0);
  // Solving the missing difficulties also counts toward the total, so only
  // mention extra problems if the targets alone won't get there.
  const extra = progress.remaining - shortOnTargets;
  return extra > 0
    ? `${list}, plus ${extra} of any difficulty, to reach your goal.`
    : `${list} to reach your goal.`;
}

// "5 problems a week · at least 2 Medium, 1 Hard"
export function describeGoal(goal: WeeklyGoal): string {
  const base = `${goal.total} ${goal.total === 1 ? "problem" : "problems"} a week`;
  const targets = DIFFICULTIES.filter((d) => goal[d] !== null).map(
    (d) => `${goal[d]} ${DIFFICULTY_LABELS[d]}`,
  );
  return targets.length > 0 ? `${base} · at least ${targets.join(", ")}` : base;
}
