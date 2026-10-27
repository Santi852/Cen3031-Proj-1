import { useEffect, useState } from "react";
import ErrorMessage from "./ErrorMessage";
import {
  getSyncStatus,
  SyncError,
  syncLeetCode,
  type SyncStatus,
} from "../leetcode/syncService";

// Re-render every `intervalMs` so time-based text (countdown, "5 minutes ago")
// stays current. The tick only triggers renders; the math always uses real
// timestamps, so a slow or paused timer can't make the countdown wrong.
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// The server reports whole minutes; we turn that into an end time once and
// count down to it, instead of decrementing a counter.
const endsAt = (minutes: number) =>
  minutes > 0 ? Date.now() + minutes * 60_000 : null;

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

// onSynced runs after a successful sync, so the page can reload its data.
export default function RefreshButton({ onSynced }: { onSynced?: () => void }) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<SyncError | null>(null);

  // One re-render per second is cheap, and it keeps the countdown and the
  // "x minutes ago" text current. Render must not call Date.now() itself
  // (React's purity rule), so all time math below uses `now`.
  const now = useNow(1000);
  const remainingMs = cooldownEndsAt ? cooldownEndsAt - now : 0;
  const coolingDown = remainingMs > 0;

  function apply(status: SyncStatus) {
    setLastSyncedAt(status.lastSyncedAt);
    setCooldownEndsAt(endsAt(status.minutesRemaining));
  }

  // Load the current status on mount, so a page reload mid-cooldown still
  // shows the countdown. `cancelled` stops a late response from updating
  // the component after it has unmounted.
  useEffect(() => {
    let cancelled = false;
    void getSyncStatus().then((status) => {
      if (!cancelled) apply(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      apply(await syncLeetCode());
      onSynced?.();
    } catch (err) {
      if (err instanceof SyncError && err.kind === "cooldown") {
        // Our clock and the server's disagreed; trust the server.
        setCooldownEndsAt(endsAt(err.minutesRemaining));
      } else {
        setError(
          err instanceof SyncError
            ? err
            : new SyncError("unavailable", "Something went wrong. Try again."),
        );
      }
    } finally {
      setSyncing(false);
    }
  }

  let label = "Refresh";
  if (syncing) label = "Syncing…";
  else if (coolingDown) label = `Refresh in ${formatCountdown(remainingMs)}`;

  return (
    <div className="sync-panel">
      <button
        type="button"
        className="button button-secondary sync-button"
        onClick={() => void sync()}
        disabled={syncing || coolingDown}
        aria-busy={syncing}
      >
        {syncing && <span className="spinner spinner-sm" aria-hidden="true" />}
        {label}
      </button>
      {/* Not aria-live: a countdown announced every second would be noise. */}
      <p className="sync-meta">
        {lastSyncedAt ? (
          <>
            Last synced{" "}
            <time
              dateTime={lastSyncedAt}
              title={new Date(lastSyncedAt).toLocaleString()}
            >
              {formatAgo(lastSyncedAt, now)}
            </time>
          </>
        ) : (
          "Not synced yet"
        )}
      </p>
      {error && <ErrorMessage message={error.message} />}
    </div>
  );
}
