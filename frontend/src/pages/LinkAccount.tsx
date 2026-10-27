import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import DifficultyBreakdown from "../components/DifficultyBreakdown";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";
import {
  LinkError,
  linkLeetCode,
  type LinkedAccount,
} from "../leetcode/linkService";

// Exactly one of these is true at any time, so the page can't end up
// half-loading and half-linked.
type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string; canRetry: boolean }
  | { kind: "linked"; account: LinkedAccount };

export default function LinkAccount() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldError, setFieldError] = useState("");

  const submitting = status.kind === "submitting";

  async function link() {
    setStatus({ kind: "submitting" });
    try {
      const account = await linkLeetCode(username.trim());
      setStatus({ kind: "linked", account });
    } catch (err) {
      setStatus(
        err instanceof LinkError
          ? {
              kind: "error",
              message: err.message,
              // Retrying only helps when LeetCode itself was the problem.
              canRetry: err.kind === "unavailable",
            }
          : {
              kind: "error",
              message: "Something went wrong. Try again.",
              canRetry: true,
            },
      );
    }
  }
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim()) {
      setFieldError("Enter your LeetCode username.");
      return;
    }
    setFieldError("");
    void link();
  }

  if (status.kind === "linked") return <LinkedView account={status.account} />;

  return (
    <section>
      <h2>Link your LeetCode account</h2>
      <p>
        We'll read your public profile to track the problems you solve. Your
        profile needs to be public.
      </p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {status.kind === "error" && (
          <ErrorMessage
            message={status.message}
            onRetry={status.canRetry ? () => void link() : undefined}
          />
        )}
        <FormField
          id="leetcode-username"
          label="LeetCode username"
          autoComplete="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldError}
          disabled={submitting}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
        >
          {submitting ? "Checking LeetCode…" : "Link account"}
        </button>
      </form>
    </section>
  );
}

function LinkedView({ account }: { account: LinkedAccount }) {
  return (
    <section>
      <h2>Account linked</h2>
      <p>
        <strong>{account.username}</strong> is now connected. Here's what you've
        solved so far:
      </p>
      <DifficultyBreakdown counts={account.counts} />
      <Link to="/" className="button button-primary">
        Go to dashboard
      </Link>
    </section>
  );
}
