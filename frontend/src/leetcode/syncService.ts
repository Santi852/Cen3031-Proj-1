// Sync service. The real endpoint is Matias's 1-08 (manual sync with a
// 15-minute cooldown), which isn't built yet, so both functions here are stubs
// that fake the server with a module-level timestamp. Swap the bodies for
// fetch() calls once 1-08 is merged.
export type SyncStatus = {
  lastSyncedAt: string | null; // ISO timestamp; null if never synced
  minutesRemaining: number; // cooldown left; 0 means a sync is allowed
};

export type SyncErrorKind = "cooldown" | "unavailable";

export class SyncError extends Error {
  kind: SyncErrorKind;
  minutesRemaining: number;

  constructor(kind: SyncErrorKind, message: string, minutesRemaining = 0) {
    super(message);
    this.kind = kind;
    this.minutesRemaining = minutesRemaining;
  }
}

// Shorten these to test the countdown by hand, e.g. 30_000 for 30 seconds.
const COOLDOWN_MS = 15 * 60_000;
// Flip to true to test the "LeetCode is down" message.
const SIMULATE_DOWN = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Pretend the user last synced two hours ago so there's a timestamp to show.
let lastSync: number | null = Date.now() - 2 * 60 * 60_000;

function minutesLeft(): number {
  if (lastSync === null) return 0;
  const ms = lastSync + COOLDOWN_MS - Date.now();
  // The server reports whole minutes, rounded up, so 30 seconds left is "1".
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

function currentStatus(): SyncStatus {
  return {
    lastSyncedAt: lastSync === null ? null : new Date(lastSync).toISOString(),
    minutesRemaining: minutesLeft(),
  };
}

// What the dashboard needs on load: when we last synced and whether the
// cooldown is still running (e.g. after a page refresh mid-cooldown).
export async function getSyncStatus(): Promise<SyncStatus> {
  await wait(300);
  return currentStatus();
}

export async function syncLeetCode(): Promise<SyncStatus> {
  await wait(1200); // syncing takes a moment; long enough to see the loading state

  const remaining = minutesLeft();
  if (remaining > 0) {
    throw new SyncError(
      "cooldown",
      `You can sync again in ${remaining} minute${remaining === 1 ? "" : "s"}.`,
      remaining,
    );
  }
  if (SIMULATE_DOWN) {
    // Per 1-08, a failed sync leaves lastSync (and the user's data) untouched.
    throw new SyncError(
      "unavailable",
      "LeetCode isn't responding right now. Your existing data is safe. Try again in a few minutes.",
    );
  }

  lastSync = Date.now();
  return currentStatus();
}
