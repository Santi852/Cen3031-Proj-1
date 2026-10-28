import { useEffect, useRef } from "react";

// Short in-app help, opened from the top bar. A native <dialog> opened with
// showModal() gives us the backdrop, Escape to close, and focus kept inside
// the sheet for free. The CSS turns it into a bottom sheet on phones.
export default function HelpSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // React only knows the `open` prop; this keeps the real dialog in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="help-sheet"
      aria-labelledby="help-title"
      // Fires on Escape and on dialog.close(), so the parent's state follows.
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="help-sheet-content">
        <div className="help-sheet-header">
          <h2 id="help-title">How StackSprint works</h2>
          <button type="button" className="button" onClick={onClose}>
            Done
          </button>
        </div>

        <section>
          <h3>Scoring</h3>
          <p>
            Easy problems are worth 1 point, Medium 3 and Hard 5. Scores are
            weekly (UTC): only problems you solve for the first time this week
            count, and repeat solves score zero.
          </p>
        </section>

        <section>
          <h3>Syncing</h3>
          <p>
            Refresh pulls your latest solves from LeetCode. You can sync once
            every 15 minutes.
          </p>
        </section>

        <section>
          <h3>Discussions</h3>
          <p>
            A problem's discussion unlocks once you've solved it yourself, so
            you never see a solution before you've earned it.
          </p>
        </section>

        <section>
          <h3>Linking LeetCode</h3>
          <p>
            Go to Profile and link your LeetCode username so your solves show up
            on the dashboard and leaderboard.
          </p>
        </section>
      </div>
    </dialog>
  );
}
