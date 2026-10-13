import "dotenv/config";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl?.trim()) {
  throw new Error(
    "Set TEST_DATABASE_URL to a PostgreSQL test database before running test:db. DATABASE_URL is never used by these tests.",
  );
}

const schema = `stacksprint_test_${randomUUID().replaceAll("-", "")}`;
const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
});
const migrationsDirectory = fileURLToPath(
  new URL("../migrations", import.meta.url),
);
const firstSolvedAt = "2026-10-12T12:00:00Z";
const verifiedAt = "2026-10-12T12:05:00Z";
let connected = false;
let schemaCreated = false;

function migrate(direction: "up" | "down") {
  return runner({
    dbClient: client,
    dir: migrationsDirectory,
    direction,
    schema,
    migrationsSchema: schema,
    migrationsTable: "pgmigrations",
    singleTransaction: true,
    advisoryLockMode: "wait",
    log: () => undefined,
  });
}

async function createUser(email = `${randomUUID()}@example.com`) {
  const result = await client.query<{ id: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, "test-password-hash"],
  );
  return result.rows[0]!.id;
}

async function createProblem(difficulty = "easy") {
  const result = await client.query<{ id: string }>(
    "INSERT INTO problems (slug, title, difficulty) VALUES ($1, $2, $3) RETURNING id",
    [`problem-${randomUUID()}`, "Test problem", difficulty],
  );
  return result.rows[0]!.id;
}

function createSolve(userId: string, problemId: string, source = "leetcode") {
  return client.query(
    `INSERT INTO submissions
      (user_id, problem_id, first_solved_at, verified_at, source)
      VALUES ($1, $2, $3, $4, $5)`,
    [userId, problemId, firstSolvedAt, verifiedAt, source],
  );
}

function createScore(
  userId: string,
  points: number,
  reachedAt: string | null,
  weekStart = "2026-10-12",
) {
  return client.query(
    `INSERT INTO weekly_scores (user_id, week_start, points, score_reached_at)
      VALUES ($1, $2, $3, $4)`,
    [userId, weekStart, points, reachedAt],
  );
}

describe("PostgreSQL schema v1", { concurrent: false }, () => {
  beforeAll(async () => {
    await client.connect();
    connected = true;
    await client.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await migrate("up");
  }, 30_000);

  beforeEach(async () => {
    await client.query("SET TIME ZONE 'UTC'");
    await client.query(`TRUNCATE
      "${schema}".posts,
      "${schema}".weekly_scores,
      "${schema}".submissions,
      "${schema}".leetcode_accounts,
      "${schema}".problems,
      "${schema}".users RESTART IDENTITY`);
  });

  afterAll(async () => {
    if (!connected) return;
    try {
      if (schemaCreated) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  });

  it("repeated migration runs preserve data and migration history", async () => {
    const userId = await createUser();
    const history = await client.query(
      "SELECT * FROM pgmigrations ORDER BY id",
    );
    expect(history.rows).toHaveLength(1);

    expect(await migrate("up")).toEqual([]);
    expect(await migrate("up")).toEqual([]);

    expect((await client.query("SELECT id FROM users")).rows).toEqual([
      { id: userId },
    ]);
    expect(
      (await client.query("SELECT * FROM pgmigrations ORDER BY id")).rows,
    ).toEqual(history.rows);
  });

  it("rolls back and reapplies inside its temporary schema", async () => {
    await createUser();
    try {
      expect(await migrate("down")).toHaveLength(1);
      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = $1 ORDER BY table_name`,
        [schema],
      );
      expect(tables.rows).toEqual([{ table_name: "pgmigrations" }]);
      expect((await client.query("SELECT * FROM pgmigrations")).rows).toEqual(
        [],
      );
    } finally {
      await migrate("up");
    }
    expect((await client.query("SELECT * FROM users")).rows).toEqual([]);
    expect(await createUser()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects duplicate emails regardless of letter case", async () => {
    await createUser("Matias@example.com");
    await expect(createUser("matias@EXAMPLE.com")).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("allows one linked account per user and prevents username reuse", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const insertAccount = (userId: string, username: string) =>
      client.query(
        "INSERT INTO leetcode_accounts (user_id, username) VALUES ($1, $2)",
        [userId, username],
      );

    await insertAccount(firstUser, "Coder");
    await expect(insertAccount(secondUser, "cODER")).rejects.toMatchObject({
      code: "23505",
    });
    await expect(
      insertAccount(firstUser, "another-coder"),
    ).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("deduplicates a user's solves while allowing other users to solve the same problem", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const problemId = await createProblem();
    await createSolve(firstUser, problemId);
    await expect(
      createSolve(firstUser, problemId, "demo"),
    ).rejects.toMatchObject({
      code: "23505",
    });
    await createSolve(secondUser, problemId);
    expect((await client.query("SELECT * FROM submissions")).rowCount).toBe(2);
  });

  it("rejects records referencing missing users or problems", async () => {
    const userId = await createUser();
    const problemId = await createProblem();
    await expect(createSolve(randomUUID(), problemId)).rejects.toMatchObject({
      code: "23503",
    });
    await expect(createSolve(userId, "999999")).rejects.toMatchObject({
      code: "23503",
    });
    await expect(
      client.query(
        "INSERT INTO leetcode_accounts (user_id, username) VALUES ($1, $2)",
        [randomUUID(), "orphan-account"],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("accepts the three scoring difficulties and rejects unknown difficulty", async () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      await createProblem(difficulty);
    }
    await expect(createProblem("unknown")).rejects.toMatchObject({
      code: "23514",
    });
    expect((await client.query("SELECT * FROM problems")).rowCount).toBe(3);
  });

  it("distinguishes live and demo solves and rejects unrecognized provenance", async () => {
    const userId = await createUser();
    await createSolve(userId, await createProblem(), "leetcode");
    await createSolve(userId, await createProblem(), "demo");
    await expect(
      createSolve(userId, await createProblem(), "self-reported"),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await client.query("SELECT source FROM submissions ORDER BY source"))
        .rows,
    ).toEqual([{ source: "demo" }, { source: "leetcode" }]);
  });

  it("keeps verified solve history when a linked account is removed", async () => {
    const userId = await createUser();
    const problemId = await createProblem();
    await client.query(
      "INSERT INTO leetcode_accounts (user_id, username) VALUES ($1, $2)",
      [userId, "linked-coder"],
    );
    await createSolve(userId, problemId);
    await client.query("DELETE FROM leetcode_accounts WHERE user_id = $1", [
      userId,
    ]);
    expect(
      (await client.query("SELECT user_id, problem_id FROM submissions")).rows,
    ).toEqual([{ user_id: userId, problem_id: problemId }]);
  });

  it("prevents deleting a problem that still has verified solve evidence", async () => {
    const userId = await createUser();
    const problemId = await createProblem();
    await createSolve(userId, problemId);
    await expect(
      client.query("DELETE FROM problems WHERE id = $1", [problemId]),
    ).rejects.toMatchObject({ code: "23503" });
    expect((await client.query("SELECT * FROM submissions")).rowCount).toBe(1);
  });

  it("allows one score per user and Monday-starting week", async () => {
    const userId = await createUser();
    await createScore(userId, 0, null);
    await expect(createScore(userId, 0, null)).rejects.toMatchObject({
      code: "23505",
    });
    await expect(
      createScore(userId, 0, null, "2026-10-13"),
    ).rejects.toMatchObject({ code: "23514" });
    await createScore(userId, 0, null, "2026-10-19");
    expect((await client.query("SELECT * FROM weekly_scores")).rowCount).toBe(
      2,
    );
  });

  it("uses an inclusive UTC week start and exclusive next-week boundary", async () => {
    await client.query("SET TIME ZONE 'America/New_York'");
    await createScore(await createUser(), 1, "2026-10-12T00:00:00Z");
    await createScore(await createUser(), 1, "2026-10-18T23:59:59.999Z");
    await expect(
      createScore(await createUser(), 1, "2026-10-11T23:59:59.999Z"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      createScore(await createUser(), 1, "2026-10-19T00:00:00Z"),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects negative scores and requires a reached time only for positive scores", async () => {
    const userId = await createUser();
    await expect(createScore(userId, -1, null)).rejects.toMatchObject({
      code: "23514",
    });
    await expect(createScore(userId, 1, null)).rejects.toMatchObject({
      code: "23514",
    });
    await expect(createScore(userId, 0, firstSolvedAt)).rejects.toMatchObject({
      code: "23514",
    });
    await createScore(userId, 0, null);
  });

  it("requires code and all post tags while preserving code formatting", async () => {
    const userId = await createUser();
    const problemId = await createProblem();
    const fields = ["code", "language", "time_complexity", "space_complexity"];
    const values = [
      "function solve() {\n  return 42;\n}\n",
      "typescript",
      "O(n)",
      "O(1)",
    ];
    const insertPost = (postValues: (string | null)[]) =>
      client.query(
        `INSERT INTO posts (user_id, problem_id, ${fields.join(", ")})
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING code`,
        [userId, problemId, ...postValues],
      );

    for (let index = 0; index < fields.length; index += 1) {
      for (const invalidValue of [null, "", "   ", "\t\n"]) {
        const invalidPost: (string | null)[] = [...values];
        invalidPost[index] = invalidValue;
        await expect(insertPost(invalidPost)).rejects.toMatchObject({
          code: invalidValue === null ? "23502" : "23514",
        });
      }
    }
    expect((await insertPost(values)).rows).toEqual([{ code: values[0] }]);
  });

  it("preserves timestamp instants across time zones and rejects verification before a solve", async () => {
    const userId = await createUser();
    const problemId = await createProblem();
    await client.query("SET TIME ZONE 'America/New_York'");
    await client.query(
      `INSERT INTO submissions
        (user_id, problem_id, first_solved_at, verified_at, source)
        VALUES ($1, $2, $3, $4, 'leetcode')`,
      [
        userId,
        problemId,
        "2026-10-12T08:00:00-04:00",
        "2026-10-12T14:05:00+02:00",
      ],
    );
    const result = await client.query<{
      first_solved_at: Date;
      verified_at: Date;
    }>("SELECT first_solved_at, verified_at FROM submissions");
    expect(result.rows[0]!.first_solved_at.toISOString()).toBe(
      "2026-10-12T12:00:00.000Z",
    );
    expect(result.rows[0]!.verified_at.toISOString()).toBe(
      "2026-10-12T12:05:00.000Z",
    );
    await expect(
      client.query(
        "UPDATE submissions SET verified_at = first_solved_at - interval '1 second'",
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
