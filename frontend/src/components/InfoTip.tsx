import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HelpIcon } from "./icons";

// A "?" button that opens a short explanation under it (a "toggletip").
// Click to open, not hover, so it works on phones and with the keyboard.
// Escape or a click anywhere else closes it.
export default function InfoTip({
  label,
  children,
}: {
  // What the button says to screen readers, e.g. "About activity".
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus(); // don't leave keyboard users stranded
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="info-tip" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button info-tip-button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <HelpIcon />
      </button>
      {open && (
        <div id={panelId} className="info-tip-panel">
          {children}
        </div>
      )}
    </div>
  );
}
