import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  follow as followUser,
  getFollowers,
  getFollowing,
  unfollow as unfollowUser,
  type Friend,
} from "./friendService";

// Fired after a follow or unfollow so every place that shows friends (the
// Friends sheet, the Friends slide, the streak board, a player sheet)
// updates at once.
export const FOLLOWING_CHANGED = "stacksprint:following-changed";

export type FollowingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; following: Friend[]; followers: Friend[] };

// Who you follow and who follows you. follow() and unfollow() throw FriendError so a sheet can
// show what went wrong.
export function useFollowing() {
  const { user } = useAuth();
  const [state, setState] = useState<FollowingState>({ status: "loading" });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      Promise.all([getFollowing(user), getFollowers(user)]).then(
        ([following, followers]) => {
          if (!cancelled) setState({ status: "ready", following, followers });
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
    window.addEventListener(FOLLOWING_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(FOLLOWING_CHANGED, load);
    };
  }, [user, reloads]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setReloads((n) => n + 1);
  }, []);

  async function follow(username: string) {
    if (!user) return;
    const friend = await followUser(user, username);
    window.dispatchEvent(new Event(FOLLOWING_CHANGED));
    return friend;
  }

  async function unfollow(userId: string) {
    if (!user) return;
    await unfollowUser(user, userId);
    window.dispatchEvent(new Event(FOLLOWING_CHANGED));
  }

  const isFollowing = (userId: string) =>
    state.status === "ready" &&
    state.following.some((f) => f.userId === userId);

  return { state, follow, unfollow, isFollowing, retry };
}
