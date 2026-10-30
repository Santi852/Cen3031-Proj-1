// The one place that talks to the Sprint 1 API (docs/SPRINT1_BACKEND.md). It
// adds the access token and turns every failure into an ApiError, so each
// service only has to decide what a failure means to its own page.
import { getAccessToken } from "../auth/authService";

export class ApiError extends Error {
  status: number; // 0 means no response came back at all
  kind: string; // the server's `kind`, e.g. "cooldown" or "locked"
  minutesRemaining: number;

  constructor(
    status: number,
    kind: string,
    message: string,
    minutesRemaining = 0,
  ) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.minutesRemaining = minutesRemaining;
  }
}

type Options = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown };

export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: Options = {},
): Promise<T> {
  let response: Response;
  try {
    // Relative URL, so Vite's proxy forwards it on the phone too.
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${getAccessToken() ?? ""}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "network",
      "Can't reach the server. Check your connection and try again.",
    );
  }

  // DELETE answers 204 with no body; a proxy error page isn't JSON. Both
  // fall back to {}.
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.kind ?? (response.status === 401 ? "unauthorized" : "unavailable"),
      response.status === 401
        ? "Your session expired. Sign in again."
        : (data.error ?? "Something went wrong. Please try again."),
      data.minutesRemaining,
    );
  }

  return data;
}
