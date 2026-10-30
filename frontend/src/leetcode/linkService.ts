// Link-account service. The real endpoint is Matias's 1-04, which isn't
// built yet, so linkLeetCode() is a stub that fakes each outcome based on
// the username. Swap the body for a fetch() call once 1-04 is merged.
export type DifficultyCounts = { easy: number; medium: number; hard: number };

export type LinkedAccount = {
  username: string;
  counts: DifficultyCounts;
};

// The three failures the backlog asks us to show separately.
export type LinkErrorKind = "not_found" | "private" | "unavailable";

export class LinkError extends Error {
  kind: LinkErrorKind;

  constructor(kind: LinkErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Stands in for the linked account the real 1-04 saves in the database, so
// the dashboard stub can see a link made on this page. Resets on page reload.
let linkedUsername: string | null = null;

export function getLinkedUsername() {
  return linkedUsername;
}

// Stub usernames for testing by hand: "missing-user", "private-user", "down".
// Anything else succeeds.
export async function linkLeetCode(username: string): Promise<LinkedAccount> {
  await wait(800); // simulate network latency

  switch (username.toLowerCase()) {
    case "missing-user":
      throw new LinkError(
        "not_found",
        `We could not find a LeetCode account with the username "${username}". Please check your spelling and try again.`,
      );
    case "private-user":
      throw new LinkError(
        "private",
        "That profile is private. Make it public in your LeetCode settings, then try again.",
      );
    case "down":
      throw new LinkError(
        "unavailable",
        "LeetCode isn't responding right now. Try again in a few minutes.",
      );
    default:
      linkedUsername = username;
      return { username, counts: { easy: 42, medium: 17, hard: 3 } };
  }
}
