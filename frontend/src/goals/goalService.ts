import { isWeeklyGoal, type WeeklyGoal } from "./goal";

// STUB until Matias adds goal storage (#91). Proposed contract:
//   GET    /api/me/goal  -> WeeklyGoal, or 204 No Content if none is set
//   PUT    /api/me/goal  <- WeeklyGoal  -> WeeklyGoal
//                          400 { error } if a value is outside the rules in
//                          goal.ts (total 1-100, targets add up to <= total)
//   DELETE /api/me/goal  -> 204
// The user always comes from the session token, never the body, so nobody can
// change another user's goal.
//
// Until then each user's goal lives in this browser's localStorage, keyed by
// user id like the badge. Every function is async so swapping in apiFetch()
// later won't change any caller.

export class GoalError extends Error {}

const keyFor = (userId: string) => `stacksprint.goal.${userId}`;

export async function getGoal(userId: string): Promise<WeeklyGoal | null> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyFor(userId));
  } catch {
    throw new GoalError("Couldn't load your weekly goal.");
  }
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    return isWeeklyGoal(saved) ? saved : null;
  } catch {
    return null; // corrupt data: treat it as "no goal" rather than breaking
  }
}

export async function saveGoal(
  userId: string,
  goal: WeeklyGoal,
): Promise<WeeklyGoal> {
  // The server will check this too; the stub plays the server's part.
  if (!isWeeklyGoal(goal)) throw new GoalError("That goal isn't valid.");
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(goal));
  } catch {
    throw new GoalError("Couldn't save your goal. Try again.");
  }
  return goal;
}

export async function clearGoal(userId: string): Promise<void> {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    throw new GoalError("Couldn't remove your goal. Try again.");
  }
}
