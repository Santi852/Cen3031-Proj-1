import "dotenv/config";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Pool, Client } from "pg";
import { runner } from "node-pg-migrate";
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createTokenService } from "../src/auth/tokens.js";
import { ApiError, type Solve } from "../src/leetcode.js";
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL required.");
const schema = `sprint1_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString: url });
const db = new Pool({
  connectionString: url,
  options: `-c search_path=${schema}`,
});
const secret = `test-only-${randomUUID()}-${randomUUID()}`;
let now = new Date("2026-10-29T12:00:00Z");
const profile = vi.fn(async (username: string) => ({
  username,
  counts: { easy: 3, medium: 2, hard: 1 },
}));
const recent = vi.fn<() => Promise<Solve[]>>();
let server: Server;
let base: string;
let owner: string;
let other: string;
let ownerId: string;
let otherId: string;
const solve = (
  slug = "two-sum",
  difficulty: Solve["difficulty"] = "easy",
  solvedAt = "2026-10-28T12:00:00Z",
): Solve => ({
  slug,
  title: slug,
  difficulty,
  solvedAt,
  submissionId: randomUUID(),
});
type Body = {
  minutesRemaining: number;
  leetcode: { counts: Record<string, number>; linked: boolean };
  top: { userId: string; points: number; rank: number }[];
  you: { rank: number };
  id: string;
  code: string;
  unlocked: boolean;
};
type TestResponse = Omit<Response, "json"> & { json(): Promise<Body> };
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  token = owner,
) {
  return fetch(base + "/api" + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }) as Promise<TestResponse>;
}
async function link(token = owner, username = "owner") {
  const r = await call("/leetcode/link", "POST", { username }, token);
  expect(r.status).toBe(200);
}
beforeAll(async () => {
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await runner({
    dbClient: admin,
    dir: fileURLToPath(new URL("../migrations", import.meta.url)),
    direction: "up",
    schema,
    migrationsSchema: schema,
    migrationsTable: "pgmigrations",
    log: () => undefined,
  });
  server = createApp({
    database: db,
    jwtSecret: secret,
    connector: { profile, recent },
    now: () => now,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 30000);
beforeEach(async () => {
  await db.query("TRUNCATE users,problems CASCADE");
  now = new Date("2026-10-29T12:00:00Z");
  profile.mockClear();
  recent.mockReset();
  recent.mockResolvedValue([solve()]);
  const rows = (
    await db.query(
      "INSERT INTO users(email,password_hash) VALUES('owner@example.com','test'),('other@example.com','test') RETURNING id",
    )
  ).rows;
  ownerId = rows[0].id;
  otherId = rows[1].id;
  const tokens = createTokenService(secret);
  owner = await tokens.issue(ownerId);
  other = await tokens.issue(otherId);
});
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  await db.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});
it("requires authentication on every protected surface", async () => {
  for (const path of [
    "/leetcode/account",
    "/leetcode/sync",
    "/dashboard",
    "/leaderboard",
    "/problems/two-sum/discussion",
    "/problems/two-sum/posts",
  ])
    expect((await call(path, "GET", undefined, "bad")).status).toBe(401);
});
it("links verified profiles, rejects duplicates and prevents switching identities", async () => {
  await link();
  expect(profile).toHaveBeenCalledWith("owner");
  expect(
    (await call("/leetcode/link", "POST", { username: "OWNER" }, other)).status,
  ).toBe(409);
  expect(
    (await call("/leetcode/link", "POST", { username: "replacement" })).status,
  ).toBe(409);
  expect(
    (await call("/leetcode/link", "POST", { username: "../../bad" })).status,
  ).toBe(400);
  await link();
  expect((await db.query("SELECT * FROM leetcode_accounts")).rowCount).toBe(1);
});
it("does not store a failed profile verification", async () => {
  profile.mockRejectedValueOnce(
    new ApiError(404, "not_found", "Missing profile"),
  );
  expect(
    (await call("/leetcode/link", "POST", { username: "missing" })).status,
  ).toBe(404);
  expect((await db.query("SELECT * FROM leetcode_accounts")).rowCount).toBe(0);
});
it("atomically syncs, deduplicates and preserves the earliest known solve", async () => {
  await link();
  recent.mockResolvedValue([solve(), solve(), solve("medium", "medium")]);
  expect((await call("/leetcode/sync", "POST")).status).toBe(200);
  expect((await db.query("SELECT * FROM submissions")).rowCount).toBe(2);
  expect(
    (await db.query("SELECT points FROM weekly_scores")).rows[0].points,
  ).toBe(4);
  now = new Date("2026-10-29T12:15:00Z");
  recent.mockResolvedValue([solve("two-sum", "easy", "2026-10-29T12:00:00Z")]);
  expect((await call("/leetcode/sync", "POST")).status).toBe(200);
  expect(
    (
      await db.query(
        "SELECT first_solved_at FROM submissions JOIN problems ON problems.id=problem_id WHERE slug='two-sum'",
      )
    ).rows[0].first_solved_at.toISOString(),
  ).toBe("2026-10-28T12:00:00.000Z");
  expect(
    (await db.query("SELECT points FROM weekly_scores")).rows[0].points,
  ).toBe(4);
});
it("serializes simultaneous syncs and returns a rounded cooldown with Retry-After", async () => {
  await link();
  const rs = await Promise.all([
    call("/leetcode/sync", "POST"),
    call("/leetcode/sync", "POST"),
  ]);
  expect(rs.map((r) => r.status).sort()).toEqual([200, 429]);
  expect(recent).toHaveBeenCalledTimes(1);
  const blocked = rs.find((r) => r.status === 429)!;
  expect(blocked.headers.get("retry-after")).toBe("900");
  expect((await blocked.json()).minutesRemaining).toBe(15);
  now = new Date("2026-10-29T12:14:30Z");
  expect((await (await call("/leetcode/sync")).json()).minutesRemaining).toBe(
    1,
  );
});
it("rolls back partial writes and preserves prior data and timestamp on failure", async () => {
  await link();
  await call("/leetcode/sync", "POST");
  const before = (await db.query("SELECT * FROM leetcode_accounts")).rows[0];
  now = new Date("2026-10-29T12:15:00Z");
  recent.mockResolvedValue([
    solve("aaa-new"),
    { ...solve("zzz-bad"), solvedAt: "invalid" },
  ]);
  expect((await call("/leetcode/sync", "POST")).status).toBe(503);
  expect((await db.query("SELECT slug FROM problems")).rows).toEqual([
    { slug: "two-sum" },
  ]);
  expect((await db.query("SELECT * FROM leetcode_accounts")).rows[0]).toEqual(
    before,
  );
  recent.mockRejectedValue(new ApiError(503, "unavailable", "Timeout"));
  expect((await call("/leetcode/sync", "POST")).status).toBe(503);
  expect(
    (await db.query("SELECT points FROM weekly_scores")).rows[0].points,
  ).toBe(1);
});
it("buckets stored first solves at Monday UTC and the rolling 30-day boundary", async () => {
  await link();
  recent.mockResolvedValue([
    solve("before", "hard", "2026-10-25T23:59:59Z"),
    solve("boundary", "medium", "2026-10-26T00:00:00Z"),
    solve("old", "easy", "2026-09-29T11:59:59Z"),
  ]);
  await call("/leetcode/sync", "POST");
  expect(
    (await (await call("/dashboard?range=week")).json()).leetcode.counts,
  ).toEqual({ easy: 0, medium: 1, hard: 0 });
  expect(
    (await (await call("/dashboard?range=30d")).json()).leetcode.counts,
  ).toEqual({ easy: 0, medium: 1, hard: 1 });
  expect((await call("/dashboard?range=all")).status).toBe(400);
  expect(
    (await (await call("/dashboard", "GET", undefined, other)).json()).leetcode
      .linked,
  ).toBe(false);
});
it("ranks equal points by earliest reached time and resets the current week", async () => {
  await link();
  await link(other, "other");
  await call("/leetcode/sync", "POST");
  recent.mockResolvedValue([solve("two-sum", "easy", "2026-10-27T12:00:00Z")]);
  await call("/leetcode/sync", "POST", undefined, other);
  const board = await (await call("/leaderboard")).json();
  expect(board.top.map((x: { userId: string }) => x.userId)).toEqual([
    otherId,
    ownerId,
  ]);
  expect(board.you.rank).toBe(2);
  now = new Date("2026-11-02T00:00:00Z");
  const reset = await (await call("/leaderboard")).json();
  expect(reset.top.map((x: { points: number }) => x.points)).toEqual([0, 0]);
  expect(reset.top.map((x: { rank: number }) => x.rank)).toEqual([1, 1]);
  expect((await call("/leaderboard?period=all")).status).toBe(400);
});
const draft = {
  code: "function solve() {\n  return 1;\n}\n",
  language: "typescript",
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
  title: "Solution",
  comment: "Explanation",
};
it("never exposes posts to locked users and permits only owner mutations", async () => {
  await link();
  await call("/leetcode/sync", "POST");
  const created = await call("/problems/two-sum/posts", "POST", draft);
  expect(created.status).toBe(201);
  const post = await created.json();
  expect(post.code).toBe(draft.code);
  const locked = await (
    await call("/problems/two-sum/discussion", "GET", undefined, other)
  ).json();
  expect(locked).toEqual({
    problem: { slug: "two-sum", title: "two-sum", difficulty: "easy" },
    unlocked: false,
  });
  for (const [path, method, body] of [
    [`/problems/two-sum/posts`, "GET", undefined],
    [`/problems/two-sum/posts/${post.id}`, "GET", undefined],
    [`/problems/two-sum/posts`, "POST", draft],
    [`/problems/two-sum/posts/${post.id}`, "PUT", draft],
    [`/problems/two-sum/posts/${post.id}`, "DELETE", undefined],
  ] as const) {
    const r = await call(path, method, body, other);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({
      error: expect.any(String),
      kind: "locked",
    });
  }
  await link(other, "other");
  await call("/leetcode/sync", "POST", undefined, other);
  expect(
    (await call(`/problems/two-sum/posts/${post.id}`, "PUT", draft, other))
      .status,
  ).toBe(404);
  expect(
    (
      await call(
        `/problems/two-sum/posts/${post.id}`,
        "DELETE",
        undefined,
        other,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await call(`/problems/two-sum/posts/${post.id}`, "PUT", {
        ...draft,
        code: "updated",
      })
    ).status,
  ).toBe(200);
  expect(
    (await call(`/problems/two-sum/posts/${post.id}`, "DELETE")).status,
  ).toBe(204);
});
it("keeps unlocks permanently even if source solves are removed", async () => {
  await link();
  await call("/leetcode/sync", "POST");
  await db.query("DELETE FROM submissions WHERE user_id=$1", [ownerId]);
  expect(
    (await (await call("/problems/two-sum/discussion")).json()).unlocked,
  ).toBe(true);
});
it("rejects missing or invalid enum tags and oversized/empty code", async () => {
  await link();
  await call("/leetcode/sync", "POST");
  for (const patch of [
    { language: "" },
    { language: "ruby" },
    { timeComplexity: "fast" },
    { spaceComplexity: undefined },
    { code: " " },
    { code: "x".repeat(20001) },
    { title: "x".repeat(101) },
  ])
    expect(
      (await call("/problems/two-sum/posts", "POST", { ...draft, ...patch }))
        .status,
    ).toBe(400);
  expect((await db.query("SELECT * FROM posts")).rowCount).toBe(0);
});
