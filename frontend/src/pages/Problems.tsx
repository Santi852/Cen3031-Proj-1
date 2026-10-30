import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import {
  CheckCircleIcon,
  CircleIcon,
  ExternalLinkIcon,
  LockIcon,
  SortIcon,
  StarIcon,
} from "../components/icons";
import Loading from "../components/Loading";
import {
  IS_DEMO,
  listProblems,
  setFavorite,
  type ProblemListItem,
} from "../leetcode/discussionService";

type Result =
  | { key: number; ok: true; problems: ProblemListItem[] }
  | { key: number; ok: false; message: string };

type SortColumn = "title" | "difficulty";
type Sort = { column: SortColumn; direction: "asc" | "desc" } | null;

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

function sortProblems(problems: ProblemListItem[], sort: Sort) {
  if (!sort) return problems; // the API's own order
  const sorted = [...problems].sort((a, b) =>
    sort.column === "title"
      ? a.title.localeCompare(b.title)
      : DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
        a.title.localeCompare(b.title),
  );
  return sort.direction === "asc" ? sorted : sorted.reverse();
}

// Every problem with a discussion: whether you solved it, a star to save it,
// and links to its discussion and to LeetCode.
export default function Problems() {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [sort, setSort] = useState<Sort>(null);
  const [favoriteError, setFavoriteError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listProblems().then(
      (problems) => {
        if (!cancelled) setResult({ key: reloads, ok: true, problems });
      },
      (err: unknown) => {
        if (cancelled) return;
        setResult({
          key: reloads,
          ok: false,
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloads]);

  // First click sorts A to Z (or Easy to Hard), the next one reverses it.
  function toggleSort(column: SortColumn) {
    setSort((s) =>
      s?.column === column && s.direction === "asc"
        ? { column, direction: "desc" }
        : { column, direction: "asc" },
    );
  }

  function updateFavorite(slug: string, favorite: boolean) {
    setResult((r) =>
      r?.ok
        ? {
            ...r,
            problems: r.problems.map((p) =>
              p.slug === slug ? { ...p, favorite } : p,
            ),
          }
        : r,
    );
  }

  // The star flips right away and is undone if saving fails, so tapping it
  // never feels slow.
  async function toggleFavorite(problem: ProblemListItem) {
    const next = !problem.favorite;
    setFavoriteError("");
    updateFavorite(problem.slug, next);
    try {
      await setFavorite(problem.slug, next);
    } catch {
      updateFavorite(problem.slug, !next);
      setFavoriteError(`Couldn't update your favorites. Try again.`);
    }
  }

  let body;
  if (!result || result.key !== reloads) {
    body = <Loading label="Loading problems…" />;
  } else if (!result.ok) {
    body = (
      <ErrorMessage
        message={result.message}
        onRetry={() => setReloads((n) => n + 1)}
      />
    );
  } else {
    body = (
      <table className="problem-table">
        <caption className="visually-hidden">
          Problems, with your status and favorites
        </caption>
        <thead>
          <tr>
            <th scope="col" className="col-status">
              Status
            </th>
            <th scope="col" className="col-star">
              <span className="visually-hidden">Favorite</span>
              <StarIcon />
            </th>
            <SortHeader
              column="title"
              label="Problem"
              sort={sort}
              onSort={toggleSort}
            />
            <SortHeader
              column="difficulty"
              label="Difficulty"
              sort={sort}
              onSort={toggleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sortProblems(result.problems, sort).map((p) => (
            <tr key={p.slug} className={p.solved ? "is-solved" : undefined}>
              <td className="col-status">
                {p.solved ? (
                  <span className="status-solved" title="Solved">
                    <CheckCircleIcon />
                    <span className="visually-hidden">Solved</span>
                  </span>
                ) : (
                  <span className="status-todo" title="Not solved yet">
                    <CircleIcon />
                    <span className="visually-hidden">Not solved</span>
                  </span>
                )}
              </td>
              <td className="col-star">
                <button
                  type="button"
                  className={
                    p.favorite ? "star-button is-favorite" : "star-button"
                  }
                  aria-label={`Favorite ${p.title}`}
                  aria-pressed={p.favorite}
                  onClick={() => void toggleFavorite(p)}
                >
                  <StarIcon />
                </button>
              </td>
              <th scope="row" className="col-title">
                <Link to={`/problem/${p.slug}`}>{p.title}</Link>
                <a
                  className="external-link"
                  href={`https://leetcode.com/problems/${p.slug}/`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${p.title} on LeetCode`}
                >
                  <ExternalLinkIcon />
                </a>
              </th>
              <td className="col-difficulty">
                {!p.solved && (
                  <span className="difficulty-lock" title="Discussion locked">
                    <LockIcon />
                    <span className="visually-hidden">Discussion locked,</span>
                  </span>
                )}
                <span className={`difficulty-text difficulty-${p.difficulty}`}>
                  {DIFFICULTY_LABEL[p.difficulty]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <section className="problems-page" aria-labelledby="problems-title">
      <header className="leaderboard-header">
        <h2 id="problems-title">Problems</h2>
        {IS_DEMO && (
          <span
            className="demo-badge"
            title="Sample problems until the problems API is ready"
          >
            Demo data
          </span>
        )}
      </header>
      {favoriteError && <ErrorMessage message={favoriteError} />}
      {body}
    </section>
  );
}

// A column header that sorts on click. aria-sort tells screen readers which
// column the table is sorted by, and in which direction.
function SortHeader({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: Sort;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  return (
    <th
      scope="col"
      className={`col-${column}`}
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        className={active ? "sort-button is-active" : "sort-button"}
        onClick={() => onSort(column)}
      >
        {label}
        <SortIcon />
      </button>
    </th>
  );
}
