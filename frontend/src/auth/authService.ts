// Stub auth service for F-08. Matias owns the real auth endpoints; until they
// land, accounts live in this browser's localStorage. Keep the function
// signatures as they are and swap the bodies for fetch() calls to the API.
// Real password hashing (bcrypt/argon2) belongs on the backend — the SHA-256
// here only keeps plain-text passwords out of localStorage during dev.

export type User = {
  id: string;
  email: string;
};

const USERS_KEY = "stacksprint.stub.users";
const SESSION_KEY = "stacksprint.stub.session";

type StoredUser = User & { passwordHash: string };

export class AuthError extends Error {}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

async function hash(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function startSession(user: User): User {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string): Promise<User> {
  const users = readUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    throw new AuthError("An account with that email already exists.");
  }
  const user: User = { id: crypto.randomUUID(), email: normalized };
  users.push({ ...user, passwordHash: await hash(password) });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return startSession(user);
}

export async function signIn(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hash(password);
  const match = readUsers().find((u) => u.email === normalized && u.passwordHash === passwordHash);
  // Same message for unknown email and wrong password so the form doesn't
  // reveal which emails have accounts.
  if (!match) throw new AuthError("Incorrect email or password.");
  return startSession({ id: match.id, email: match.email });
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}
