import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import {
  leaveLeague,
  LeagueError,
  regenerateCode,
  type League,
} from "./leagueService";

// League settings, opened by the gear (or "Invite friends" in a new league). Ordered by how often
// you need each thing: the join code first, New code (creator only), and
// Leave last, so the destructive action is never the first thing you tap.
// Uses the same sheet classes as Create/Join, so it slides up on phones.
export default function LeagueSettings({
  league,
  onRegenerated,
  onClose,
}: {
  league: League;
  onRegenerated: (joinCode: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="league-sheet"
      aria-labelledby="league-settings-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="league-sheet-content league-settings">
        <h2 id="league-settings-title">League settings</h2>

        <JoinCode code={league.joinCode} />

        {league.isCreator && user && (
          <ConfirmAction
            label="New code"
            prompt="The old code stops working. Members stay in."
            confirmLabel="Make new code"
            onConfirm={async () =>
              onRegenerated(await regenerateCode(user, league.id))
            }
          />
        )}

        <hr className="league-settings-divider" />

        {user && (
          <ConfirmAction
            label="Leave league"
            prompt={
              `Leave ${league.name}? You can rejoin with a code, and your ` +
              "scores are kept." +
              (league.isCreator && league.members.length > 1
                ? " The member who's been in longest becomes the creator."
                : "")
            }
            confirmLabel="Leave"
            danger
            onConfirm={async () => {
              await leaveLeague(user, league.id);
              navigate("/social");
            }}
          />
        )}
      </div>
    </dialog>
  );
}

function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The clipboard API only exists over https (and localhost). On the phone
  // dev server it's missing, so hide Copy; the code is still there to read.
  const canCopy = typeof navigator.clipboard?.writeText === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the code and copy it yourself.");
    }
  }

  return (
    <div className="league-code">
      <p className="league-code-label">Join code</p>
      {/* aria-live reads the new code out after New code. */}
      <p className="league-code-value" aria-live="polite">
        {code}
      </p>
      {canCopy && (
        <div className="league-code-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={copy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

// A setting that asks before it acts, in place: the button turns into the
// question plus Cancel / confirm, instead of opening a second sheet on top
// of this one. Used by New code and Leave league.
function ConfirmAction({
  label,
  prompt,
  confirmLabel,
  danger = false,
  onConfirm,
}: {
  label: string;
  prompt: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setConfirming(false);
    } catch (err) {
      setError(err instanceof LeagueError ? err.message : "Couldn't do that.");
    } finally {
      setBusy(false);
    }
  }

  const className = `league-setting${danger ? " is-danger" : ""}`;

  if (!confirming) {
    return (
      <div className={className}>
        <button
          type="button"
          className="league-setting-button"
          onClick={() => setConfirming(true)}
        >
          {label}
        </button>
      </div>
    );
  }

  return (
    <div className={className} role="group" aria-label={label}>
      <p className="league-setting-prompt">{prompt}</p>
      <div className="league-setting-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setConfirming(false)}
          // The question just appeared: focus the safe choice, so a quick
          // Enter or a stray tap cancels instead of leaving.
          autoFocus
        >
          Cancel
        </button>
        <button
          type="button"
          className={`button ${danger ? "button-danger" : "button-primary"}`}
          onClick={confirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
