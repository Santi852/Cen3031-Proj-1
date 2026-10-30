import type { DifficultyCounts } from "../leetcode/linkService";

// Easy / Medium / Hard solve counts. Shared by the link-account success view
// (1-05) and the dashboard card (1-13).
export default function DifficultyBreakdown({
  counts,
}: {
  counts: DifficultyCounts;
}) {
  return (
    <dl className="difficulty-counts">
      <div className="difficulty-easy">
        <dt>Easy</dt>
        <dd>{counts.easy}</dd>
      </div>
      <div className="difficulty-medium">
        <dt>Medium</dt>
        <dd>{counts.medium}</dd>
      </div>
      <div className="difficulty-hard">
        <dt>Hard</dt>
        <dd>{counts.hard}</dd>
      </div>
    </dl>
  );
}
