import { useTimeZone } from "../settings/TimeZoneContext";
import { formatLocalDateTime } from "../settings/dates";
import ErrorMessage from "./ErrorMessage";
import type { SyncState } from "../leetcode/useSync";

// Both components below take the result of useSync(), so the icon and the
// status line can sit in different parts of the card.

// 754000 ms -> "12:34"
function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "just now", "5 minutes ago", "3 hours ago", "yesterday"
function formatAgo(iso: string, now: number) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (seconds > -60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

// Icon-only refresh button. An icon has no text for screen readers, so the
// label goes in aria-label (and title, for a hover tooltip) and changes with
// the state, countdown included.
export function RefreshButton({ sync }: { sync: SyncState }) {
  let label = "Refresh LeetCode data";
  if (sync.syncing) label = "Syncing…";
  else if (sync.coolingDown)
    label = `Refresh available in ${formatCountdown(sync.remainingMs)}`;

  return (
    <button
      type="button"
      className="icon-button sync-button"
      onClick={sync.sync}
      disabled={sync.syncing || sync.coolingDown}
      aria-busy={sync.syncing}
      aria-label={label}
      title={label}
    >
      {/* A circular arrow. currentColor = it takes the button's text color. */}
      <svg
        className="sync-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}

// "Last synced 4 hours ago", plus the cooldown countdown (1-09 requires it to
// be visible, and the icon can't show it) and any sync error.
export function SyncStatus({ sync }: { sync: SyncState }) {
  const { timeZone } = useTimeZone();
  return (
    <div className="sync-panel">
      {/* Not aria-live: a countdown announced every second would be noise. */}
      <p className="sync-meta">
        {sync.lastSyncedAt ? (
          <>
            Last synced{" "}
            <time
              dateTime={sync.lastSyncedAt}
              title={formatLocalDateTime(sync.lastSyncedAt, timeZone)}
            >
              {formatAgo(sync.lastSyncedAt, sync.now)}
            </time>
          </>
        ) : (
          "Not synced yet"
        )}
        {sync.coolingDown && (
          <> · Refresh in {formatCountdown(sync.remainingMs)}</>
        )}
      </p>
      {sync.error && <ErrorMessage message={sync.error.message} />}
    </div>
  );
}
