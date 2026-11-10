import { useEffect, useState } from "react";
import { DEFAULT_BADGE, type Badge } from "./badge";
import { getBadge, saveBadge } from "./badgeService";

// Fired after a save so every place showing your badge (top bar, leaderboard)
// updates at once, not only the one that saved it.
const CHANGED = "stacksprint:badge-changed";

// The signed-in user's badge. Shows the default while loading, so the top bar
// never has an empty hole. save() throws BadgeError so the editor can show it.
export function useMyBadge(userId: string | undefined) {
  const [badge, setBadge] = useState<Badge>(DEFAULT_BADGE);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = () =>
      getBadge(userId).then((saved) => {
        if (!cancelled) setBadge(saved);
      });
    load();
    window.addEventListener(CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED, load);
    };
  }, [userId]);

  async function save(next: Badge) {
    if (!userId) return;
    setBadge(await saveBadge(userId, next));
    window.dispatchEvent(new Event(CHANGED));
  }

  return { badge, save };
}
