import { useCallback, useEffect, useState } from "react";
import type { WeeklyGoal } from "./goal";
import { clearGoal, getGoal, saveGoal } from "./goalService";

// Fired after a save or remove so every place showing the goal (Profile,
// Dashboard) stays in sync, the same trick as useMyBadge.
const CHANGED = "stacksprint:goal-changed";

export type GoalState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; goal: WeeklyGoal | null };

// The signed-in user's weekly goal. save() and remove() throw GoalError so the
// form can show what went wrong.
export function useWeeklyGoal(userId: string | undefined) {
  const [state, setState] = useState<GoalState>({ status: "loading" });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = () =>
      getGoal(userId).then(
        (goal) => {
          if (!cancelled) setState({ status: "ready", goal });
        },
        (err: unknown) => {
          if (!cancelled)
            setState({
              status: "error",
              message:
                err instanceof Error ? err.message : "Something went wrong.",
            });
        },
      );
    load();
    window.addEventListener(CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED, load);
    };
  }, [userId, reloads]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  }, []);

  async function save(next: WeeklyGoal) {
    if (!userId) return;
    const saved = await saveGoal(userId, next);
    setState({ status: "ready", goal: saved });
    window.dispatchEvent(new Event(CHANGED));
  }

  async function remove() {
    if (!userId) return;
    await clearGoal(userId);
    setState({ status: "ready", goal: null });
    window.dispatchEvent(new Event(CHANGED));
  }

  return { state, save, remove, retry };
}
