import type { ReactNode } from "react";

// Simple line icons for the tab bar. They draw with currentColor, so an icon
// takes the color of its link (muted normally, accent on the active tab).
// aria-hidden: the tab's text label is what screen readers announce.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <Icon>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </Icon>
  );
}

export function DashboardIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  );
}

export function ProfileIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}

export function HelpIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon>
      <path d="M9 5v14M15 5v14" />
    </Icon>
  );
}

export function PlayIcon() {
  return (
    <Icon>
      <path d="M7 5l12 7-12 7z" />
    </Icon>
  );
}

export function LockIcon() {
  return (
    <Icon>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}
