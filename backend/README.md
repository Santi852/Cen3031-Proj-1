# StackSprint backend

F-05 provides PostgreSQL schema v1 and migration tooling. F-06 adds the authentication API. Use Node from the root `.nvmrc`, install dependencies with `npm ci` and `npm run setup`, and use PostgreSQL 17.

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

## Authentication setup

Before starting the API, replace the `JWT_SECRET` placeholder in `backend/.env` with a private random value. Generate one locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not commit or share the generated value. Startup rejects missing secrets, secrets shorter than 32 UTF-8 bytes, and example placeholders. Set `FRONTEND_ORIGIN` to the exact browser origin without a trailing slash (default `http://localhost:5173`). `PORT` defaults to `3001`. Both development and compiled startup require `DATABASE_URL` and `JWT_SECRET`; neither uses a fallback database or signing key. Run migrations before authentication requests.

```bash
npm run db:migrate
npm run dev:backend
```

The API uses a bounded PostgreSQL connection pool. `/api/health` is a process-liveness check and does not query the database; authentication needs the configured database to be available.

## Authentication API

| Method and path         | Request                                                                    | Successful response                                             |
| ----------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `POST /api/auth/signup` | JSON `{ "email": "coder@example.com", "password": "a-long-password-123" }` | `201` with the session response below                           |
| `POST /api/auth/signin` | The same JSON fields                                                       | `200` with the session response below                           |
| `GET /api/auth/me`      | `Authorization: Bearer <accessToken>`                                      | `200 { "user": { "id": "...", "email": "coder@example.com" } }` |

Sign-up and sign-in return:

```json
{
  "user": { "id": "...", "email": "coder@example.com" },
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

Emails are trimmed and lowercased, with a maximum of 254 characters. Passwords must have 8–128 Unicode code points and are never trimmed or normalized. The existing frontend additionally checks for a letter and number; the API permits long passphrases without that composition rule. Passwords are stored with randomly salted Argon2id hashes (19 MiB memory, two iterations, one lane), following the [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Plaintext passwords and hashes are never returned.

Errors use `{ "error": "message" }`: `400` for invalid fields or malformed JSON, `409` for an existing email, `401` for incorrect sign-in credentials or missing/invalid authentication, `413` for bodies larger than 16 KiB, and `429` for too many attempts. Wrong passwords and unknown accounts return the same sign-in error and both perform password-hash verification. Unexpected database failures return a generic `500` without database details.

Tokens use HS256 and expire after one hour. Verification requires the expected issuer, audience, issue time, expiry, and UUID user ID. The reusable `requireAuth` middleware verifies the token and loads the current user into `res.locals.user`; deleting a user therefore invalidates access immediately. Tokens belong in the `Authorization` header, never a URL. Auth responses use `Cache-Control: no-store`.

The frontend integration remains a separate task: its browser-storage stub does not call these endpoints yet. The response's `user` matches its existing `{ id, email }` shape. When connecting the UI, keep the bearer token in memory, send it on protected requests, and clear it on sign-out or a `401`. A reload requires sign-in again with this initial contract. There is no refresh-token or server sign-out endpoint; discarding a token does not revoke other copies before their one-hour expiry. Use HTTPS outside localhost, and keep the signing secret stable across API restarts. Rotating it invalidates all existing tokens.

Sign-up and sign-in share a limit of 20 requests per IP per 15 minutes, including failed attempts, and expose retry/rate-limit headers. The limiter is in memory and resets on restart. Express uses the direct peer address; it does not trust forwarded IP headers. Configure trusted proxies deliberately and use a shared limit store before running behind a proxy or across multiple API instances. CORS permits the single `FRONTEND_ORIGIN` and the `Authorization` header; it does not enable cookie credentials.

## Migrations

`npm run db:migrate` applies pending SQL migrations in a transaction and records them in `pgmigrations`. Running it again leaves applied migrations and their data intact. An advisory lock prevents concurrent migration runs.

`npm run db:rollback` reverses the latest migration. Reversing schema v1 drops all six application tables and their data; use it only on disposable local databases. Add a new migration to change a schema that is already shared with teammates.

Create a migration from `backend/` with:

```bash
npx node-pg-migrate create add_sessions --migration-file-language sql
```

Keep both `-- Up Migration` and `-- Down Migration` sections. Commit migrations and dependency lockfiles together. `pg` and `node-pg-migrate` are production dependencies so migration commands also work when development dependencies are omitted.

## Schema v1

| Table               | Purpose and guarantees                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`             | UUID identity, case-insensitive unique email, nonempty password hash, creation time. F-06 stores Argon2id hashes and exposes public user fields only. |
| `leetcode_accounts` | One linked account per user and a case-insensitive unique provider username, with link/sync times. No provider credentials.                           |
| `problems`          | Stable internal ID, unique lowercase slug, title, and `easy`/`medium`/`hard` difficulty.                                                              |
| `submissions`       | One accepted first-solve record per user/problem, with verification time and an explicit `leetcode` or `demo` source.                                 |
| `weekly_scores`     | One score per user and Monday week-start date; nonnegative points, plus the time a positive score was reached for later tie-breaking.                 |
| `posts`             | Author, problem, code, nonempty language/complexity tags, and creation/update times.                                                                  |

Timestamps use `timestamptz`. Weeks run from Monday 00:00 UTC up to the next Monday, exclusive. A positive score must have a reached-at time inside its week; a zero score has no reached-at time. Score calculation and ranking are separate backlog tasks.

Email and provider usernames must be trimmed. Case-insensitive uniqueness is an application identity rule; provider username case behavior should be checked during connector integration. Problems use canonical lowercase slugs.

`submissions` stores first accepted solves, not every attempt. A future sync must preserve the earliest known timestamp when upserting; a recent-submission feed alone cannot prove the user's first lifetime solve. Unlinking a LeetCode account does not delete solves or posts. Deleting a user removes their linked account, solves, scores, and posts; referenced problems cannot be deleted. Indexes support foreign keys, user/date queries, leaderboards, and per-problem post lists.

No source defaults to live data: inserts must specify `leetcode` or `demo`. Later APIs must enforce discussion access and the allowed language/Big-O enums; v1 only requires nonblank tags. `updated_at` must be set explicitly when later services update a score or post. Groups, votes, comments, session storage, and integration secrets are outside F-05.

## Database tests

`npm run test:db` requires `TEST_DATABASE_URL` from the environment or `backend/.env`. It never falls back to `DATABASE_URL`. Point it at a local/test database where the role can create schemas. Each suite creates a unique schema, applies the real migration, and removes only its own schema. The database suite checks constraints and rollback/reapply; the auth suite starts a real HTTP server and checks account persistence, sign-in, protected access, token rejection, validation, and request limits. Existing application tables are not reset.

`npm run check` runs non-database checks, including hashing, token, credential-validation, configuration, and health tests. CI also applies migrations and runs database/auth integration tests against PostgreSQL 17 before the existing browser smoke test. CI uses a disposable database and a test-only signing key.
