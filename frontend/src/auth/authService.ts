// Auth service backed by the F-06 API (/api/auth/*). The server owns accounts
// and password hashing; the browser only keeps the signed-in user and their
// access token so the session survives a page refresh.

export type User = {
  id: string;
  email: string;
};

const SESSION_KEY = "stacksprint.session";

export class AuthError extends Error {}

type AuthResponse = { user: User; accessToken: string; expiresIn: number };

// What we save in localStorage. expiresAt is a timestamp in milliseconds so
// we can tell when the token has run out without asking the server.
type StoredSession = { user: User; accessToken: string; expiresAt: number };

async function postCredentials(
  path: "signup" | "signin",
  email: string,
  password: string,
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // fetch only throws when no response came back at all (backend down,
    // offline). HTTP errors like 401 arrive as normal responses below.
    throw new AuthError(
      "Can't reach the server. Check your connection and try again.",
    );
  }

  // If the body isn't JSON (e.g. a proxy error page), fall back to {}
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthError(
      body.error ?? "Something went wrong. Please try again.",
    );
  }

  return body;
}

function startSession({ user, accessToken, expiresIn }: AuthResponse): User {
  const session: StoredSession = {
    user,
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

function readSession(): StoredSession | null {
  try {
    const session: StoredSession | null = JSON.parse(
      localStorage.getItem(SESSION_KEY) ?? "null",
    );
    // An expired token would be rejected by the server anyway, so treat it
    // as signed out and send the user back to /signin.
    if (!session || Date.now() >= session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  return readSession()?.user ?? null;
}

// For later API calls that need `Authorization: Bearer <token>`.
export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null;
}

export async function signUp(email: string, password: string): Promise<User> {
  return startSession(await postCredentials("signup", email, password));
}

export async function signIn(email: string, password: string): Promise<User> {
  return startSession(await postCredentials("signin", email, password));
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}
