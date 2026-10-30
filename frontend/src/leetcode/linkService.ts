// Link-account service, backed by Matias's 1-04 (POST /leetcode/link and
// GET /leetcode/account).
import { ApiError, apiFetch } from "./apiClient";

export type DifficultyCounts = { easy: number; medium: number; hard: number };

export type LinkedAccount = {
  username: string;
  counts: DifficultyCounts;
};

// The three failures the backlog asks us to show separately, plus "rejected"
// for the rest (name already taken, invalid username...), which retrying
// won't fix. The server's message explains those.
export type LinkErrorKind =
  "not_found" | "private" | "unavailable" | "rejected";

export class LinkError extends Error {
  kind: LinkErrorKind;

  constructor(kind: LinkErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function toLinkError(err: unknown, username: string) {
  if (!(err instanceof ApiError)) throw err;
  switch (err.kind) {
    case "not_found":
      return new LinkError(
        "not_found",
        `We could not find a LeetCode account with the username "${username}". Please check your spelling and try again.`,
      );
    case "private":
      return new LinkError(
        "private",
        "That profile is private. Make it public in your LeetCode settings, then try again.",
      );
    case "unavailable":
      return new LinkError(
        "unavailable",
        "LeetCode isn't responding right now. Try again in a few minutes.",
      );
    case "network":
      return new LinkError("unavailable", err.message);
    default:
      return new LinkError("rejected", err.message);
  }
}

// null means no LeetCode account is linked yet.
export async function getLinkedAccount(): Promise<LinkedAccount | null> {
  const account = await apiFetch<LinkedAccount | { linked: false }>(
    "/leetcode/account",
  );
  return "username" in account ? account : null;
}

export async function linkLeetCode(username: string): Promise<LinkedAccount> {
  try {
    return await apiFetch<LinkedAccount>("/leetcode/link", {
      method: "POST",
      body: { username },
    });
  } catch (err) {
    throw toLinkError(err, username);
  }
}
