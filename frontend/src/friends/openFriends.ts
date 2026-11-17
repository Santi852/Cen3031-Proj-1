// The Friends sheet lives in the top bar, but other places open it too (the
// Activity card's "Find friends", the empty Friends slide). They fire this
// event and the top bar opens the sheet on the right tab.
export const OPEN_FRIENDS = "stacksprint:open-friends";

export type FriendsTab = "following" | "followers" | "leagues";

export function openFriends(tab: FriendsTab = "following") {
  window.dispatchEvent(
    new CustomEvent<FriendsTab>(OPEN_FRIENDS, { detail: tab }),
  );
}
