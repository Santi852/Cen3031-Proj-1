import type { User } from "../auth/authService";
import {
  getLeaderboard,
  type LeaderboardEntry,
} from "../leetcode/leaderboardService";

// STUB until Matias builds the groups API (2-11 #58, 2-12 #59). The UI calls
// them "leagues"; the backlog and API call them "groups". Proposed contract:
//   GET    /api/groups              -> LeagueSummary[]  (leagues you're in)
//   POST   /api/groups              <- { name }  -> League (you're the creator)
//   POST   /api/groups/join         <- { code }  -> League; 404 bad/old code
//   GET    /api/groups/:id          -> League; 404 if you're not a member
//   POST   /api/groups/:id/leave    -> 204; your history is kept (2-11)
//   POST   /api/groups/:id/code     -> { joinCode }; 403 if not the creator
// Scores are this week's points, the same as the global weekly board.
//
// Until then every league lives in this browser's localStorage, shared by all
// accounts, so you can demo it by signing in as two users on one laptop. Every
// function is async so swapping in apiFetch() later won't change any caller.

// Same shape as a global board row, so both use one LeaderboardRow.
export type LeagueEntry = LeaderboardEntry;

export type LeagueSummary = {
  id: string;
  name: string;
  memberCount: number;
  isCreator: boolean;
  yourRank: number;
};

export type League = {
  id: string;
  name: string;
  joinCode: string;
  isCreator: boolean;
  members: LeagueEntry[]; // ranked, best first
};

export class LeagueError extends Error {}

export const NAME_MAX = 40;

// ---- Storage (only the stub needs this part) ------------------------------

type StoredMember = {
  userId: string;
  username: string;
  points: number; // last known weekly points (see refreshMyPoints)
  joinedAt: number;
  leftAt: number | null; // leaving keeps the row: "history kept" in 2-11
};

type StoredLeague = {
  id: string;
  name: string;
  joinCode: string;
  creatorId: string;
  members: StoredMember[];
};

const KEY = "stacksprint.leagues";

function load(): StoredLeague[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function save(leagues: StoredLeague[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(leagues));
  } catch {
    throw new LeagueError("Couldn't save. Try again.");
  }
}

// No 0/O or 1/I/L, so a code read aloud or off a screen can't be mistyped.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  // getRandomValues works over plain http too (randomUUID needs https), so
  // the stub still runs when you open the dev server on your phone.
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function uniqueCode(leagues: StoredLeague[]) {
  let code = randomCode();
  while (leagues.some((l) => l.joinCode === code)) code = randomCode();
  return code;
}

const isActive = (m: StoredMember) => m.leftAt === null;

function activeMember(league: StoredLeague, userId: string) {
  return league.members.find((m) => m.userId === userId && isActive(m));
}

// Same tie rule as the global board: equal points share a rank (1, 1, 3).
function rank(members: StoredMember[]): LeagueEntry[] {
  const sorted = members
    .filter(isActive)
    .sort((a, b) => b.points - a.points || a.joinedAt - b.joinedAt);
  return sorted.map((m) => ({
    rank: 1 + sorted.filter((o) => o.points > m.points).length,
    userId: m.userId,
    username: m.username,
    points: m.points,
  }));
}

function toLeague(league: StoredLeague, userId: string): League {
  return {
    id: league.id,
    name: league.name,
    joinCode: league.joinCode,
    isCreator: league.creatorId === userId,
    members: rank(league.members),
  };
}

// The stub can't see other people's scores, so each member's points are
// copied from the real weekly board whenever they open their leagues. Your
// LeetCode username comes along too; before linking we show your email.
async function refreshMyPoints(user: User) {
  let points = 0;
  let username = user.email;
  try {
    const { you } = await getLeaderboard("week");
    if (you) ({ points, username } = you);
  } catch {
    return; // API down: keep the last known numbers.
  }
  const leagues = load();
  for (const league of leagues) {
    const me = activeMember(league, user.id);
    if (me) Object.assign(me, { points, username });
  }
  save(leagues);
}

function findMine(leagues: StoredLeague[], id: string, userId: string) {
  const league = leagues.find((l) => l.id === id);
  if (!league || !activeMember(league, userId)) {
    throw new LeagueError("That league doesn't exist or you're not in it.");
  }
  return league;
}

// ---- The API the pages use ------------------------------------------------

export async function getMyLeagues(user: User): Promise<LeagueSummary[]> {
  await refreshMyPoints(user);
  return load()
    .filter((l) => activeMember(l, user.id))
    .map((l) => {
      const members = rank(l.members);
      return {
        id: l.id,
        name: l.name,
        memberCount: members.length,
        isCreator: l.creatorId === user.id,
        yourRank: members.find((m) => m.userId === user.id)!.rank,
      };
    });
}

export async function getLeague(user: User, id: string): Promise<League> {
  await refreshMyPoints(user);
  return toLeague(findMine(load(), id, user.id), user.id);
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Give your league a name.";
  if (trimmed.length > NAME_MAX) {
    return `Keep it under ${NAME_MAX} characters.`;
  }
  return null;
}

export async function createLeague(user: User, name: string): Promise<League> {
  const problem = validateName(name);
  if (problem) throw new LeagueError(problem);
  const leagues = load();
  const league: StoredLeague = {
    id: randomCode(12),
    name: name.trim(),
    joinCode: uniqueCode(leagues),
    creatorId: user.id,
    members: [
      {
        userId: user.id,
        username: user.email,
        points: 0,
        joinedAt: Date.now(),
        leftAt: null,
      },
    ],
  };
  save([...leagues, league]);
  await refreshMyPoints(user);
  return getLeague(user, league.id);
}

// Codes are case-insensitive and ignore spaces, so "abc 23x" still works.
export function normalizeCode(code: string) {
  return code.replace(/\s/g, "").toUpperCase();
}

export async function joinLeague(user: User, code: string): Promise<League> {
  const leagues = load();
  const league = leagues.find((l) => l.joinCode === normalizeCode(code));
  // An old code fails the same way as a made-up one (2-14 tests this).
  if (!league) throw new LeagueError("No league has that code.");
  if (activeMember(league, user.id)) {
    throw new LeagueError("You're already in this league.");
  }
  const old = league.members.find((m) => m.userId === user.id);
  if (old) {
    old.leftAt = null; // rejoining: pick your old row back up
  } else {
    league.members.push({
      userId: user.id,
      username: user.email,
      points: 0,
      joinedAt: Date.now(),
      leftAt: null,
    });
  }
  save(leagues);
  await refreshMyPoints(user);
  return getLeague(user, league.id);
}

// If the creator leaves, the member who's been in longest takes over, so
// someone can still regenerate the code. The last one out leaves it empty.
export async function leaveLeague(user: User, id: string): Promise<void> {
  const leagues = load();
  const league = findMine(leagues, id, user.id);
  activeMember(league, user.id)!.leftAt = Date.now();
  if (league.creatorId === user.id) {
    const next = league.members
      .filter(isActive)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) league.creatorId = next.userId;
  }
  save(leagues);
}

export async function regenerateCode(user: User, id: string): Promise<string> {
  const leagues = load();
  const league = findMine(leagues, id, user.id);
  if (league.creatorId !== user.id) {
    throw new LeagueError("Only the league's creator can change the code.");
  }
  league.joinCode = uniqueCode(leagues);
  save(leagues);
  return league.joinCode;
}
