import type { DifficultyCounts } from "../leetcode/linkService";

type Targets = Partial<Record<keyof DifficultyCounts, number | null>>;

// Easy / Medium / Hard solve counts. Shared by the link-account success view
// (1-05) and the dashboard card (1-13). With weekly-goal targets (#91) a count
// reads "1/2", and a met target gets the is-met class.
export default function DifficultyBreakdown({
  counts,
  targets,
}: {
  counts: DifficultyCounts;
  targets?: Targets;
}) {
  const row = (difficulty: keyof DifficultyCounts, label: string) => {
    const target = targets?.[difficulty] ?? null;
    const met = target !== null && counts[difficulty] >= target;
    return (
      <div
        className={`difficulty-${difficulty}${met ? " is-met" : ""}`}
        key={difficulty}
      >
        <dt>{label}</dt>
        <dd>
          {counts[difficulty]}
          {target !== null && (
            <span className="difficulty-target">
              /{target}
              <span className="visually-hidden">
                {met ? ", target met" : " target"}
              </span>
            </span>
          )}
        </dd>
      </div>
    );
  };

  return (
    <dl className="difficulty-counts">
      {row("easy", "Easy")}
      {row("medium", "Medium")}
      {row("hard", "Hard")}
    </dl>
  );
}
