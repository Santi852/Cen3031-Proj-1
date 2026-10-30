import { useEffect, useState } from "react";
import {
  getSyncStatus,
  SyncError,
  syncLeetCode,
  type SyncStatus,
} from "./syncService";

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

// All the sync state in one place, so the refresh icon (card header) and the
// "Last synced" line (card footer) can live apart but stay in step: the page
// calls this once and hands the result to both.
// onSynced runs after a successful sync, so the page can reload its data.
export function useSync(onSynced?: () => void) {
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
    getSyncStatus().then(
      (status) => {
        if (!cancelled) apply(status);
      },
      // Only the "Last synced" text is missing; pressing Refresh still works
      // and reports any real problem.
      () => {},
    );
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

  return {
    lastSyncedAt,
    syncing,
    coolingDown,
    remainingMs,
    error,
    now,
    sync: () => void sync(),
  };
}

export type SyncState = ReturnType<typeof useSync>;
