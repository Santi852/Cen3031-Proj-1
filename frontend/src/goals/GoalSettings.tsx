import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import FormField from "../components/FormField";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  describeGoal,
  coverTargets,
  draftFromGoal,
  parseGoal,
  type GoalDraft,
  type GoalErrors,
  type WeeklyGoal,
} from "./goal";
import type { useWeeklyGoal } from "./useWeeklyGoal";

type GoalSettingsProps = ReturnType<typeof useWeeklyGoal>;

// The "Weekly goal" card on Profile (#91). Shows the saved goal; Edit swaps the
// summary for a small form in place, so there's no extra page or sheet.
export default function GoalSettings({
  state,
  save,
  remove,
  retry,
}: GoalSettingsProps) {
  // The dashboard's "Set a weekly goal" link lands on /profile#weekly-goal:
  // open the form right away and scroll to it. React Router doesn't scroll to
  // #hashes by itself.
  const { hash } = useLocation();
  const fromLink = hash === "#weekly-goal";
  const [editing, setEditing] = useState(fromLink);
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fromLink) cardRef.current?.scrollIntoView({ block: "center" });
  }, [fromLink]);

  const goal = state.status === "ready" ? state.goal : null;

  return (
    // The id lets the dashboard link straight here (/profile#weekly-goal).
    <section
      id="weekly-goal"
      ref={cardRef}
      className="profile-card"
      aria-labelledby="weekly-goal-title"
    >
      <h3 id="weekly-goal-title">Weekly goal</h3>

      {state.status === "loading" && (
        <p className="profile-row-detail">Loading…</p>
      )}

      {state.status === "error" && (
        <div className="profile-row">
          <p className="profile-row-detail">{state.message}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && !editing && (
        <div className="profile-row">
          <div>
            <p className="profile-row-title">
              {goal ? describeGoal(goal) : "No goal yet"}
            </p>
            <p className="profile-row-detail">
              {goal
                ? "Resets every Monday at 00:00 UTC."
                : "Pick how many problems to solve each week and track it on your dashboard."}
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setEditing(true)}
          >
            {goal ? "Edit" : "Set goal"}
          </button>
        </div>
      )}

      {state.status === "ready" && editing && (
        <GoalForm
          goal={goal}
          onSave={async (next) => {
            await save(next);
            setEditing(false);
          }}
          onRemove={
            goal
              ? async () => {
                  await remove();
                  setEditing(false);
                }
              : undefined
          }
          onCancel={() => setEditing(false)}
        />
      )}
    </section>
  );
}

type GoalFormProps = {
  goal: WeeklyGoal | null;
  onSave: (goal: WeeklyGoal) => Promise<void>;
  // Only when there's a saved goal to remove.
  onRemove?: () => Promise<void>;
  onCancel: () => void;
};

function GoalForm({ goal, onSave, onRemove, onCancel }: GoalFormProps) {
  const [draft, setDraft] = useState<GoalDraft>(() => draftFromGoal(goal));
  // Difficulty targets are optional, so they start hidden unless you have some.
  const [showTargets, setShowTargets] = useState(
    () => goal !== null && DIFFICULTIES.some((d) => goal[d] !== null),
  );
  const [errors, setErrors] = useState<GoalErrors>({});
  const [busy, setBusy] = useState(false);

  const update = (field: keyof GoalDraft, value: string) => {
    const next = { ...draft, [field]: value };
    // Editing a target can raise the total; editing the total never touches
    // the targets (lowering it too far shows an error on Save instead).
    const covered = field === "total" ? next : coverTargets(next);
    setDraft(covered);
    // Clear that field's error as soon as they start fixing it, and the
    // total's too if it was just raised for them.
    setErrors((e) => ({
      ...e,
      [field]: undefined,
      ...(covered.total !== next.total && { total: undefined }),
      form: undefined,
    }));
  };

  // Shared by Save and Remove: run it, and show a failure under the form.
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Something went wrong.",
      });
      setBusy(false);
    }
    // On success the form closes, so there's nothing to reset.
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Hidden targets don't count: hiding them means "no difficulty targets".
    const parsed = parseGoal(
      showTargets ? draft : { ...draft, easy: "", medium: "", hard: "" },
    );
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    void run(() => onSave(parsed.goal));
  }

  return (
    <form className="goal-form" onSubmit={handleSubmit} noValidate>
      <FormField
        id="goal-total"
        label="Problems per week"
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        value={draft.total}
        error={errors.total}
        onChange={(e) => update("total", e.target.value)}
        autoFocus
      />

      <label className="goal-targets-toggle">
        <input
          type="checkbox"
          checked={showTargets}
          onChange={(e) => {
            setShowTargets(e.target.checked);
            // Showing targets kept from earlier counts as setting them.
            if (e.target.checked) setDraft(coverTargets);
          }}
        />
        Set targets by difficulty
      </label>

      {showTargets && (
        <fieldset className="goal-targets">
          <legend className="visually-hidden">Targets by difficulty</legend>
          {DIFFICULTIES.map((d) => (
            <FormField
              key={d}
              id={`goal-${d}`}
              label={DIFFICULTY_LABELS[d]}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Any"
              value={draft[d]}
              error={errors[d]}
              onChange={(e) => update(d, e.target.value)}
            />
          ))}
          <p className="field-hint">
            At least this many of each, counted inside your total. Leave one
            empty for no target.
          </p>
        </fieldset>
      )}

      {errors.form && (
        <p className="field-error" role="alert">
          {errors.form}
        </p>
      )}

      <div className="goal-form-actions">
        {onRemove && (
          <button
            type="button"
            className="text-button goal-remove"
            disabled={busy}
            onClick={() => void run(onRemove)}
          >
            Remove goal
          </button>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
