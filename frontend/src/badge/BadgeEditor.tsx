import { useEffect, useRef, useState } from "react";
import ErrorMessage from "../components/ErrorMessage";
import {
  BADGE_COLORS,
  BADGE_PATTERNS,
  PATTERN_LABELS,
  describeBadge,
  type Badge,
  type BadgeColor,
} from "./badge";
import BadgeIcon from "./BadgeIcon";
import { BadgeError } from "./badgeService";

// The badge editor, opened from the top bar badge. The parent mounts it only
// while open, so the draft starts from the saved badge every time and Cancel
// just throws the draft away. Same native <dialog> approach as HelpSheet.
export default function BadgeEditor({
  badge,
  onSave,
  onClose,
}: {
  badge: Badge;
  onSave: (badge: Badge) => Promise<void>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(badge);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setError(
        err instanceof BadgeError ? err.message : "Couldn't save your badge.",
      );
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="badge-editor"
      aria-labelledby="badge-editor-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="badge-editor-content">
        <h2 id="badge-editor-title">Edit badge</h2>

        {/* The live preview, big and centered. aria-live reads the new
            description after each change, since the preview can't be "seen". */}
        <div className="badge-editor-preview">
          <BadgeIcon badge={draft} decorative />
          <p className="visually-hidden" aria-live="polite">
            {describeBadge(draft)}
          </p>
        </div>

        {/* All three pickers in one view. Real radio buttons, hidden behind
            the tiles: arrow keys move between options and screen readers say
            "3 of 13" for free. */}
        <fieldset className="badge-options badge-patterns">
          <legend className="badge-options-label">Pattern</legend>
          {BADGE_PATTERNS.map((pattern) => (
            <label key={pattern} className="badge-option">
              <input
                type="radio"
                name="badge-pattern"
                className="visually-hidden"
                checked={draft.pattern === pattern}
                onChange={() => setDraft({ ...draft, pattern })}
              />
              <BadgeIcon badge={{ ...draft, pattern }} decorative />
              <span className="visually-hidden">{PATTERN_LABELS[pattern]}</span>
            </label>
          ))}
        </fieldset>

        <ColorPicker
          label="Color 1"
          name="badge-primary"
          value={draft.primary}
          onChange={(primary) => setDraft({ ...draft, primary })}
        />
        <ColorPicker
          label="Color 2"
          name="badge-secondary"
          value={draft.secondary}
          onChange={(secondary) => setDraft({ ...draft, secondary })}
        />

        {error && <ErrorMessage message={error} />}

        <div className="badge-editor-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// One row of color swatches. Color 1 and Color 2 are the same picker, so it's
// a small component instead of two copies of the same markup.
function ColorPicker({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: BadgeColor;
  onChange: (color: BadgeColor) => void;
}) {
  return (
    <fieldset className="badge-options badge-colors">
      <legend className="badge-options-label">{label}</legend>
      {(Object.keys(BADGE_COLORS) as BadgeColor[]).map((color) => (
        <label key={color} className="badge-option">
          <input
            type="radio"
            name={name}
            className="visually-hidden"
            checked={value === color}
            onChange={() => onChange(color)}
          />
          {/* Inline style because the color is data, not design. */}
          <span
            className="badge-swatch"
            style={{ background: BADGE_COLORS[color].hex }}
          />
          <span className="visually-hidden">{BADGE_COLORS[color].label}</span>
        </label>
      ))}
    </fieldset>
  );
}
