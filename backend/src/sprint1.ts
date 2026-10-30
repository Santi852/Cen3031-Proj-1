import express from "express";
import { createDemoConnector } from "./demoConnector.js";
import { rateLimit } from "express-rate-limit";
import type { Pool, PoolClient } from "pg";
import { requireAuth } from "./auth/middleware.js";
import { createUserStore } from "./auth/users.js";
import { createTokenService } from "./auth/tokens.js";
import {
  ApiError,
  createLeetCodeConnector,
  minutesRemaining,
  parsePost,
  weekStart,
  type LeetCodeConnector,
  type Solve,
} from "./leetcode.js";

export type SprintOptions = {
  database: Pick<Pool, "query" | "connect">;
  jwtSecret: string;
  connector?: LeetCodeConnector;
  dataSource?: "leetcode" | "demo";
  now?: () => Date;
};
export function createSprintRouter(options: SprintOptions) {
  const router = express.Router();
  const db = options.database;
  const clock = options.now ?? (() => new Date());
  const source = options.dataSource ?? "leetcode";
  const connector =
    options.connector ??
    (source === "demo"
      ? createDemoConnector(clock)
      : createLeetCodeConnector());
  router.use((req, res, next) => {
    if (!/^\/(leetcode|dashboard|leaderboard|problems)(\/|$)/.test(req.path)) {
      next("router");
      return;
    }
    next();
  });
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(
    requireAuth(createUserStore(db), createTokenService(options.jwtSecret)),
  );
  router.use(express.json({ limit: "128kb" }));
  router.post(
    ["/leetcode/link", "/leetcode/sync"],
    rateLimit({
      windowMs: 900000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Too many provider requests. Try again later.",
        kind: "rate_limited",
      },
    }),
  );
  async function transaction<T>(
    user: string,
    run: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      // All account mutations serialize on the user row, including the first link.
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user]);
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  router.post("/leetcode/link", async (req, res) => {
    const username = req.body?.username;
    if (
      typeof username !== "string" ||
      !/^[a-zA-Z0-9_-]{1,50}$/.test(username.trim())
    )
      throw new ApiError(400, "invalid", "Enter a valid LeetCode username.");
    const profile = await connector.profile(username.trim());
    try {
      await transaction(res.locals.user.id, async (client) => {
        const current = await client.query(
          "SELECT username FROM leetcode_accounts WHERE user_id=$1",
          [res.locals.user.id],
        );
        if (
          current.rows[0] &&
          current.rows[0].username.toLowerCase() !==
            profile.username.toLowerCase()
        )
          throw new ApiError(
            409,
            "already_linked",
            "This user already has a linked account.",
          );
        await client.query(
          `INSERT INTO leetcode_accounts(user_id,username,profile_counts) VALUES($1,$2,$3)
          ON CONFLICT(user_id) DO UPDATE SET profile_counts=EXCLUDED.profile_counts`,
          [res.locals.user.id, profile.username, profile.counts],
        );
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      )
        throw new ApiError(
          409,
          "duplicate",
          "That LeetCode username is already linked.",
        );
      throw error;
    }
    res.status(200).json(profile);
  });
  router.get("/leetcode/account", async (_req, res) => {
    const result = await db.query(
      "SELECT username,profile_counts AS counts FROM leetcode_accounts WHERE user_id=$1",
      [res.locals.user.id],
    );
    res.json(result.rows[0] ?? { linked: false });
  });
  router.get("/leetcode/sync", async (_req, res) => {
    const result = await db.query(
      "SELECT last_synced_at FROM leetcode_accounts WHERE user_id=$1",
      [res.locals.user.id],
    );
    const last = result.rows[0]?.last_synced_at ?? null;
    res.json({
      lastSyncedAt: last,
      minutesRemaining: minutesRemaining(last, clock()),
    });
  });
  router.post("/leetcode/sync", async (_req, res) => {
    const user = res.locals.user.id;
    const result = await transaction(user, async (client) => {
      const account = (
        await client.query(
          "SELECT username,last_synced_at FROM leetcode_accounts WHERE user_id=$1",
          [user],
        )
      ).rows[0];
      if (!account)
        throw new ApiError(
          409,
          "unlinked",
          "Link your LeetCode account first.",
        );
      const now = clock();
      const remaining = minutesRemaining(account.last_synced_at, now);
      if (remaining)
        throw new ApiError(
          429,
          "cooldown",
          "Wait before syncing again.",
          remaining,
        );
      if (source === "demo") {
        const live = await client.query(
          "SELECT 1 FROM submissions WHERE user_id=$1 AND source='leetcode' LIMIT 1",
          [user],
        );
        if (live.rowCount)
          throw new ApiError(
            409,
            "source_conflict",
            "This account has live solve history. Use a separate demo account and database.",
          );
      }
      const solves = await connector.recent(account.username);
      // Sort to avoid deadlocks when different users import the same problems.
      for (const solve of [...solves].sort((a, b) =>
        a.slug.localeCompare(b.slug),
      )) {
        validateSolve(solve, now);
        const problem = (
          await client.query(
            `INSERT INTO problems(slug,title,difficulty) VALUES($1,$2,$3)
          ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title RETURNING id`,
            [solve.slug, solve.title, solve.difficulty],
          )
        ).rows[0];
        await client.query(
          `INSERT INTO submissions(user_id,problem_id,first_solved_at,verified_at,source,source_submission_id)
          VALUES($1,$2,$3,$4,$6,$5) ON CONFLICT(user_id,problem_id) DO UPDATE SET
          first_solved_at=CASE WHEN submissions.source<>EXCLUDED.source THEN EXCLUDED.first_solved_at ELSE LEAST(submissions.first_solved_at,EXCLUDED.first_solved_at) END,
          verified_at=EXCLUDED.verified_at,source=EXCLUDED.source,source_submission_id=EXCLUDED.source_submission_id`,
          [user, problem.id, solve.solvedAt, now, solve.submissionId, source],
        );
        await client.query(
          "INSERT INTO discussion_unlocks(user_id,problem_id,data_source) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [user, problem.id, source],
        );
      }
      const start = weekStart(now);
      const score = (
        await client.query(
          `SELECT COALESCE(sum(CASE p.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 3 ELSE 5 END),0)::integer AS points,
        max(s.first_solved_at) AS reached FROM submissions s JOIN problems p ON p.id=s.problem_id
        WHERE s.user_id=$1 AND s.source=$4 AND s.first_solved_at >= $2 AND s.first_solved_at <= $3`,
          [user, start, now, source],
        )
      ).rows[0];
      await client.query(
        `INSERT INTO weekly_scores(user_id,week_start,points,score_reached_at,updated_at,data_source) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(user_id,week_start,data_source) DO UPDATE SET points=EXCLUDED.points,score_reached_at=EXCLUDED.score_reached_at,updated_at=EXCLUDED.updated_at`,
        [
          user,
          start.toISOString().slice(0, 10),
          score.points,
          score.reached,
          now,
          source,
        ],
      );
      await client.query(
        "UPDATE leetcode_accounts SET last_synced_at=$2 WHERE user_id=$1",
        [user, now],
      );
      return {
        lastSyncedAt: now.toISOString(),
        minutesRemaining: 15,
        imported: solves.length,
        dataSource: source,
      };
    });
    res.json(result);
  });
  router.get("/dashboard", async (req, res) => {
    const range = req.query.range ?? "week";
    if (range !== "week" && range !== "30d")
      throw new ApiError(400, "invalid", "Range must be week or 30d.");
    const user = res.locals.user.id;
    const account = (
      await db.query(
        "SELECT username FROM leetcode_accounts WHERE user_id=$1",
        [user],
      )
    ).rows[0];
    if (!account) {
      res.json({ range, leetcode: { linked: false } });
      return;
    }
    const now = clock();
    const start =
      range === "week"
        ? weekStart(now)
        : new Date(now.getTime() - 30 * 86400000);
    const counts = { easy: 0, medium: 0, hard: 0 };
    const rows = await db.query(
      `SELECT p.difficulty,count(*)::integer AS count FROM submissions s JOIN problems p ON p.id=s.problem_id
      WHERE user_id=$1 AND source=$4 AND first_solved_at >= $2 AND first_solved_at <= $3 GROUP BY p.difficulty`,
      [user, start, now, source],
    );
    for (const row of rows.rows)
      counts[row.difficulty as keyof typeof counts] = row.count;
    res.json({
      range,
      leetcode: { linked: true, username: account.username, counts },
    });
  });
  router.get("/leaderboard", async (req, res) => {
    if (req.query.period !== undefined && req.query.period !== "week")
      throw new ApiError(
        400,
        "invalid",
        "Only the weekly leaderboard is supported.",
      );
    const rows = (
      await db.query(
        `WITH ranked AS (
      SELECT a.user_id AS "userId",a.username,COALESCE(s.points,0) AS points,
      rank() OVER(ORDER BY COALESCE(s.points,0) DESC,s.score_reached_at ASC NULLS LAST)::integer AS rank
      FROM leetcode_accounts a LEFT JOIN weekly_scores s ON s.user_id=a.user_id AND s.week_start=$1 AND s.data_source=$2)
      SELECT * FROM ranked ORDER BY rank,username,"userId"`,
        [weekStart(clock()).toISOString().slice(0, 10), source],
      )
    ).rows;
    res.json({
      period: "week",
      top: rows.slice(0, 4),
      you: rows.find((x) => x.userId === res.locals.user.id) ?? null,
    });
  });
  async function gate(user: string, slug: string, required: boolean) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200)
      throw new ApiError(404, "not_found", "Problem not found.");
    const row = (
      await db.query(
        `SELECT p.id,p.slug,p.title,p.difficulty,EXISTS(SELECT 1 FROM discussion_unlocks u WHERE u.problem_id=p.id AND u.user_id=$2 AND u.data_source=$3) AS unlocked FROM problems p WHERE p.slug=$1`,
        [slug, user, source],
      )
    ).rows[0];
    if (!row) throw new ApiError(404, "not_found", "Problem not found.");
    if (required && !row.unlocked)
      throw new ApiError(
        403,
        "locked",
        "Solve this problem before accessing posts.",
      );
    return row;
  }
  router.get("/problems/:slug/discussion", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, false);
    res.json({
      problem: { slug: p.slug, title: p.title, difficulty: p.difficulty },
      unlocked: p.unlocked,
    });
  });
  const selection = `SELECT p.id,pr.slug AS "problemSlug",p.user_id AS "authorId",COALESCE(a.username,'Member') AS "authorName",p.title,p.comment,p.code,p.language,p.time_complexity AS "timeComplexity",p.space_complexity AS "spaceComplexity",p.created_at AS "createdAt",p.updated_at AS "updatedAt" FROM posts p JOIN problems pr ON pr.id=p.problem_id LEFT JOIN leetcode_accounts a ON a.user_id=p.user_id`;
  router.get("/problems/:slug/posts", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, true);
    const offset = Number(req.query.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new ApiError(400, "invalid", "Invalid offset.");
    res.json(
      (
        await db.query(
          `${selection} WHERE p.problem_id=$1 ORDER BY p.created_at DESC,p.id LIMIT 50 OFFSET $2`,
          [p.id, offset],
        )
      ).rows,
    );
  });
  router.get("/problems/:slug/posts/:id", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, true);
    checkId(req.params.id);
    const row = (
      await db.query(`${selection} WHERE p.problem_id=$1 AND p.id=$2`, [
        p.id,
        req.params.id,
      ])
    ).rows[0];
    if (!row) throw new ApiError(404, "not_found", "Post not found.");
    res.json(row);
  });
  router.post("/problems/:slug/posts", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, true);
    const draft = parsePost(req.body);
    const row = (
      await db.query(
        `INSERT INTO posts(user_id,problem_id,code,language,time_complexity,space_complexity,title,comment)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          res.locals.user.id,
          p.id,
          draft.code,
          draft.language,
          draft.timeComplexity,
          draft.spaceComplexity,
          draft.title,
          draft.comment,
        ],
      )
    ).rows[0];
    res
      .status(201)
      .json((await db.query(`${selection} WHERE p.id=$1`, [row.id])).rows[0]);
  });
  router.put("/problems/:slug/posts/:id", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, true);
    checkId(req.params.id);
    const draft = parsePost(req.body);
    const result = await db.query(
      `UPDATE posts SET code=$4,language=$5,time_complexity=$6,space_complexity=$7,title=$8,comment=$9,updated_at=now()
      WHERE id=$1 AND problem_id=$2 AND user_id=$3 RETURNING id`,
      [
        req.params.id,
        p.id,
        res.locals.user.id,
        draft.code,
        draft.language,
        draft.timeComplexity,
        draft.spaceComplexity,
        draft.title,
        draft.comment,
      ],
    );
    if (!result.rowCount)
      throw new ApiError(404, "not_found", "Own post not found.");
    res.json(
      (await db.query(`${selection} WHERE p.id=$1`, [req.params.id])).rows[0],
    );
  });
  router.delete("/problems/:slug/posts/:id", async (req, res) => {
    const p = await gate(res.locals.user.id, req.params.slug, true);
    checkId(req.params.id);
    const result = await db.query(
      "DELETE FROM posts WHERE id=$1 AND problem_id=$2 AND user_id=$3",
      [req.params.id, p.id, res.locals.user.id],
    );
    if (!result.rowCount)
      throw new ApiError(404, "not_found", "Own post not found.");
    res.status(204).end();
  });
  return router;
}
function checkId(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ApiError(404, "not_found", "Post not found.");
}
function validateSolve(s: Solve, now: Date) {
  if (
    !s ||
    typeof s.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) ||
    s.slug.length > 200 ||
    typeof s.title !== "string" ||
    !s.title.trim() ||
    s.title.length > 500 ||
    !["easy", "medium", "hard"].includes(s.difficulty) ||
    typeof s.submissionId !== "string" ||
    !s.submissionId.trim() ||
    !Number.isFinite(Date.parse(s.solvedAt)) ||
    Date.parse(s.solvedAt) <= 0 ||
    Date.parse(s.solvedAt) > now.getTime()
  )
    throw new ApiError(
      503,
      "unavailable",
      "Invalid provider data. Existing data is unchanged.",
    );
}
