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

export function CodeIcon() {
  return (
    <Icon>
      <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
    </Icon>
  );
}

export function CheckCircleIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Icon>
  );
}

export function CircleIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
    </Icon>
  );
}

// Outline by default; CSS fills it in for favorites (fill: currentColor).
export function StarIcon() {
  return (
    <Icon>
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z" />
    </Icon>
  );
}

export function ExternalLinkIcon() {
  return (
    <Icon>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  );
}

export function SortIcon() {
  return (
    <Icon>
      <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />
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

export function ArrowUpRightIcon() {
  return (
    <Icon>
      <path d="M7 17L17 7M8 7h9v9" />
    </Icon>
  );
}

// Outline by default; CSS fills it in once you've liked the post.
export function HeartIcon() {
  return (
    <Icon>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </Icon>
  );
}
