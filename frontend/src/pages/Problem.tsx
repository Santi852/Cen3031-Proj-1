import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import { ExternalLinkIcon, LockIcon } from "../components/icons";
import Loading from "../components/Loading";
import PostList from "../components/PostList";
import {
  checkSolve,
  DiscussionError,
  getDiscussion,
  listSampleProblems,
  type Discussion,
  type Problem as ProblemInfo,
} from "../leetcode/discussionService";

// The outcome of one request. `key` says which request it answers, so a
// result for the previous problem never shows on the next one.
type LoadState =
  | { key: string; status: "error"; message: string; notFound: boolean }
  | { key: string; status: "ready"; discussion: Discussion };

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function Problem() {
  const { slug = "" } = useParams();
  // Bumped by "Try again" to refetch.
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const key = `${slug}:${reloads}`;

  useEffect(() => {
    const requestKey = `${slug}:${reloads}`;
    // Ignore the answer if the user moved to another problem first.
    let cancelled = false;
    getDiscussion(slug).then(
      (discussion) => {
        if (!cancelled)
          setState({ key: requestKey, status: "ready", discussion });
      },
      (err: unknown) => {
        if (cancelled) return;
        setState({
          key: requestKey,
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong.",
          notFound: err instanceof DiscussionError && err.kind === "not_found",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, reloads]);

  if (!state || state.key !== key) {
    return <Loading label="Loading the problem…" />;
  }
  if (state.status === "error") {
    return (
      <section className="problem-page">
        <ErrorMessage
          message={state.message}
          onRetry={state.notFound ? undefined : () => setReloads((n) => n + 1)}
        />
        {state.notFound && <SampleProblems />}
      </section>
    );
  }

  const { discussion } = state;
  return (
    <section className="problem-page" aria-labelledby="problem-title">
      <ProblemHeader problem={discussion.problem} />
      {discussion.unlocked ? (
        <UnlockedDiscussion slug={slug} />
      ) : (
        <LockedDiscussion
          slug={slug}
          onUnlocked={(next) =>
            setState({ key, status: "ready", discussion: next })
          }
        />
      )}
    </section>
  );
}

function ProblemHeader({ problem }: { problem: ProblemInfo }) {
  return (
    <header className="problem-header">
      <h2 id="problem-title">{problem.title}</h2>
      <div className="problem-meta">
        <span
          className={`difficulty-pill difficulty-pill-${problem.difficulty}`}
        >
          {DIFFICULTY_LABEL[problem.difficulty]}
        </span>
        <a
          className="leetcode-pill"
          href={`https://leetcode.com/problems/${problem.slug}/`}
          target="_blank"
          rel="noreferrer"
        >
          LeetCode
          <ExternalLinkIcon />
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      </div>
    </header>
  );
}

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "still-locked" }
  | { status: "error"; message: string };

// The gate itself is on the server (1-18). This view only explains why the
// discussion is hidden and lets you ask the server to check again.
function LockedDiscussion({
  slug,
  onUnlocked,
}: {
  slug: string;
  onUnlocked: (discussion: Discussion) => void;
}) {
  const [check, setCheck] = useState<CheckState>({ status: "idle" });
  const checking = check.status === "checking";

  async function handleCheck() {
    setCheck({ status: "checking" });
    try {
      const next = await checkSolve(slug);
      if (next.unlocked) onUnlocked(next);
      else setCheck({ status: "still-locked" });
    } catch (err) {
      // Includes the sync cooldown, whose message says how long to wait.
      setCheck({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again.",
      });
    }
  }

  return (
    <div className="discussion-locked">
      <LockIcon />
      <h3>Discussion locked</h3>
      <p>
        Solve this problem on LeetCode to see how others solved it. Posts unlock
        once your solve is verified, and stay unlocked for good.
      </p>
      {/* role="status" announces the result without moving focus. */}
      <div role="status">
        {check.status === "still-locked" && (
          <p className="discussion-locked-result">
            We synced with LeetCode but didn't find a solve for this problem
            yet. LeetCode can take a minute to update, so try again shortly.
          </p>
        )}
      </div>
      {check.status === "error" && <ErrorMessage message={check.message} />}
      <button
        type="button"
        className="button button-primary"
        onClick={() => void handleCheck()}
        disabled={checking}
      >
        {checking ? "Checking LeetCode…" : "I just solved it"}
      </button>
    </div>
  );
}

function UnlockedDiscussion({ slug }: { slug: string }) {
  return (
    <div className="discussion">
      <div className="discussion-header">
        <h3>Solutions</h3>
        <Link className="button button-primary" to={`/problem/${slug}/new`}>
          Write a post
        </Link>
      </div>
      <PostList slug={slug} />
    </div>
  );
}

// There's no problem browser yet, so a bad link offers a few to try.
function SampleProblems() {
  return (
    <div className="sample-problems">
      <p>Try one of these:</p>
      <ul>
        {listSampleProblems().map((p) => (
          <li key={p.slug}>
            <Link to={`/problem/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
