import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import FormField from "../components/FormField";
import {
  createLeague,
  joinLeague,
  LeagueError,
  NAME_MAX,
  validateName,
} from "./leagueService";

// Create and Join are the same sheet: one text box and a submit button, so
// one component with a `mode` instead of two near-copies. On success it goes
// straight to the league's page. Mounted only while open, like BadgeEditor.
const COPY = {
  create: {
    title: "Create a league",
    label: "League name",
    placeholder: "e.g. CEN3031 study group",
    submit: "Create",
    busy: "Creating...",
  },
  join: {
    title: "Join a league",
    label: "Join code",
    placeholder: "6 characters, e.g. K7QM2X",
    submit: "Join",
    busy: "Joining...",
  },
} as const;

export default function LeagueSheet({
  mode,
  onClose,
}: {
  mode: "create" | "join";
  onClose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: FormEvent) {
    // A <form> lets Enter submit; preventDefault stops the page reload.
    event.preventDefault();
    if (!user) return;
    // Check the name here first so a typo doesn't wait on a request.
    const problem =
      mode === "create"
        ? validateName(value)
        : value.trim()
          ? null
          : "Enter the code you were sent.";
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const league =
        mode === "create"
          ? await createLeague(user, value)
          : await joinLeague(user, value);
      navigate(`/social/leagues/${league.id}`);
    } catch (err) {
      setError(
        err instanceof LeagueError ? err.message : "Something went wrong.",
      );
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="league-sheet"
      aria-labelledby="league-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="league-sheet-content" onSubmit={handleSubmit} noValidate>
        <h2 id="league-sheet-title">{copy.title}</h2>
        <FormField
          id="league-sheet-input"
          label={copy.label}
          placeholder={copy.placeholder}
          value={value}
          error={error}
          onChange={(event) => setValue(event.target.value)}
          maxLength={mode === "create" ? NAME_MAX : undefined}
          autoComplete="off"
          // Codes are all caps; this stops phones from capitalizing only the
          // first letter, and from "correcting" a code into a word.
          autoCapitalize={mode === "join" ? "characters" : "sentences"}
          spellCheck={false}
          autoFocus
        />
        <div className="league-sheet-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={busy}
          >
            {busy ? copy.busy : copy.submit}
          </button>
        </div>
      </form>
    </dialog>
  );
}
