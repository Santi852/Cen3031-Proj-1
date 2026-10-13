# StackSprint database

F-05 provides PostgreSQL schema v1 and migration tooling. Use Node from the root `.nvmrc`, install dependencies with `npm ci` and `npm run setup`, and use PostgreSQL 17.

## Local database

From the repository root:

```bash
cp backend/.env.example backend/.env
docker compose up -d --wait postgres
npm run db:migrate
npm run test:db
```

Keep an existing `.env` file if you have already configured it. The Compose service binds only to localhost and uses development-only credentials matching `.env.example`. It stores data in the `postgres_data` volume. `docker compose stop postgres` stops it without removing that data.

You may use an existing local PostgreSQL 17 installation instead. Create a database and set `DATABASE_URL` in `backend/.env`. The migration command runs from `backend/` and loads that file. Environment variables supplied by the shell take precedence.

## Migrations

`npm run db:migrate` applies pending SQL migrations in a transaction and records them in `pgmigrations`. Running it again leaves applied migrations and their data intact. An advisory lock prevents concurrent migration runs.

`npm run db:rollback` reverses the latest migration. Reversing schema v1 drops all six application tables and their data; use it only on disposable local databases. Add a new migration to change a schema that is already shared with teammates.

Create a migration from `backend/` with:

```bash
npx node-pg-migrate create add_sessions --migration-file-language sql
```

Keep both `-- Up Migration` and `-- Down Migration` sections. Commit migrations and dependency lockfiles together. `pg` and `node-pg-migrate` are production dependencies so migration commands also work when development dependencies are omitted.

## Schema v1

| Table               | Purpose and guarantees                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`             | UUID identity, case-insensitive unique email, nonempty password hash, creation time. Password hashing and authentication endpoints belong to F-06. |
| `leetcode_accounts` | One linked account per user and a case-insensitive unique provider username, with link/sync times. No provider credentials.                        |
| `problems`          | Stable internal ID, unique lowercase slug, title, and `easy`/`medium`/`hard` difficulty.                                                           |
| `submissions`       | One accepted first-solve record per user/problem, with verification time and an explicit `leetcode` or `demo` source.                              |
| `weekly_scores`     | One score per user and Monday week-start date; nonnegative points, plus the time a positive score was reached for later tie-breaking.              |
| `posts`             | Author, problem, code, nonempty language/complexity tags, and creation/update times.                                                               |

Timestamps use `timestamptz`. Weeks run from Monday 00:00 UTC up to the next Monday, exclusive. A positive score must have a reached-at time inside its week; a zero score has no reached-at time. Score calculation and ranking are separate backlog tasks.

Email and provider usernames must be trimmed. Case-insensitive uniqueness is an application identity rule; provider username case behavior should be checked during connector integration. Problems use canonical lowercase slugs.

`submissions` stores first accepted solves, not every attempt. A future sync must preserve the earliest known timestamp when upserting; a recent-submission feed alone cannot prove the user's first lifetime solve. Unlinking a LeetCode account does not delete solves or posts. Deleting a user removes their linked account, solves, scores, and posts; referenced problems cannot be deleted. Indexes support foreign keys, user/date queries, leaderboards, and per-problem post lists.

No source defaults to live data: inserts must specify `leetcode` or `demo`. Later APIs must enforce discussion access and the allowed language/Big-O enums; v1 only requires nonblank tags. `updated_at` must be set explicitly when later services update a score or post. Groups, votes, comments, session storage, and integration secrets are outside F-05.

## Database tests

`npm run test:db` requires `TEST_DATABASE_URL` from the environment or `backend/.env`. It never falls back to `DATABASE_URL`. Point it at a local/test database where the role can create schemas. Each run creates a unique schema, applies the real migration, checks constraints and rollback/reapply behavior, and removes only its own schema. Existing application tables are not reset.

`npm run check` keeps the existing non-database checks. CI also runs the database tests against a PostgreSQL 17 service. The health endpoint and frontend do not require a database connection yet.
