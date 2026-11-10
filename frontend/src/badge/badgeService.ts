import { DEFAULT_BADGE, isBadge, type Badge } from "./badge";

// STUB until Matias adds badge storage (#94). Proposed contract:
//   GET /api/me/badge  -> { pattern, primary, secondary }  (default if unset)
//   PUT /api/me/badge  <- same body; 400 on an unknown pattern or color
// Until then each user's badge lives in this browser's localStorage, keyed by
// user id so two accounts on one laptop don't share a badge. Both functions
// are async so swapping in fetch() later won't change any caller.

export class BadgeError extends Error {}

const keyFor = (userId: string) => `stacksprint.badge.${userId}`;

export async function getBadge(userId: string): Promise<Badge> {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(keyFor(userId)) ?? "null",
    );
    return isBadge(saved) ? saved : DEFAULT_BADGE;
  } catch {
    // Corrupt JSON or blocked storage: fall back instead of breaking the bar.
    return DEFAULT_BADGE;
  }
}

export async function saveBadge(userId: string, badge: Badge): Promise<Badge> {
  if (!isBadge(badge)) throw new BadgeError("That badge isn't supported.");
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(badge));
  } catch {
    throw new BadgeError("Couldn't save your badge. Try again.");
  }
  return badge;
}
