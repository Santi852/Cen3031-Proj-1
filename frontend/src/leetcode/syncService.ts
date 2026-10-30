// Sync service, backed by Matias's 1-08 (manual sync with a 15-minute
// cooldown). The server owns the cooldown; the page only displays it.
import { ApiError, apiFetch } from "./apiClient";

export type SyncStatus = {
  lastSyncedAt: string | null; // ISO timestamp; null if never synced
  minutesRemaining: number; // cooldown left; 0 means a sync is allowed
};

// "rejected" is everything retrying won't fix on its own, like not having a
// linked account yet. The server's message explains it.
export type SyncErrorKind = "cooldown" | "unavailable" | "rejected";

export class SyncError extends Error {
  kind: SyncErrorKind;
  minutesRemaining: number;

  constructor(kind: SyncErrorKind, message: string, minutesRemaining = 0) {
    super(message);
    this.kind = kind;
    this.minutesRemaining = minutesRemaining;
  }
}

// What the dashboard needs on load: when we last synced and whether the
// cooldown is still running (e.g. after a page refresh mid-cooldown).
export function getSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>("/leetcode/sync");
}

export async function syncLeetCode(): Promise<SyncStatus> {
  try {
    return await apiFetch<SyncStatus>("/leetcode/sync", { method: "POST" });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    switch (err.kind) {
      case "cooldown": {
        const remaining = err.minutesRemaining;
        throw new SyncError(
          "cooldown",
          `You can sync again in ${remaining} minute${remaining === 1 ? "" : "s"}.`,
          remaining,
        );
      }
      case "unavailable":
        // Per 1-08, a failed sync leaves the user's data untouched.
        throw new SyncError(
          "unavailable",
          "LeetCode isn't responding right now. Your existing data is safe. Try again in a few minutes.",
        );
      case "network":
        throw new SyncError("unavailable", err.message);
      default:
        throw new SyncError("rejected", err.message);
    }
  }
}
