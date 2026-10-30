# Sprint 1 backend - Matias

Sprint 0 uses F-prefixed issue IDs. Sprint 1 uses 1-prefixed IDs. The previous foundation closeout incorrectly called Sprint 0 work Sprint 1; that heading is corrected in this change.

## Scope

Implements 1-04 (#26), 1-07 (#29), 1-08 (#30), 1-12 (#34), 1-16 (#38), 1-18 (#40), and 1-21 (#43). These issues remain open until teammate review and merge. The frontend integration and Hussain's connector/scoring tasks remain separately owned.

Use the existing Node 22 / PostgreSQL 17 setup, then run `npm run db:migrate`. This adds profile counts, permanent discussion unlocks, post title/comment fields, and language/complexity checks. No existing tables or records are dropped. Historical posts are preserved; enum checks apply to new writes. The down migration removes the new fields and unlocks, so use it only in disposable test databases.

## API contract

Every route below is under `/api`, requires the existing Bearer token, and sets `Cache-Control: no-store`. The authenticated user supplies the identity; body fields cannot select an author or account owner.

| Method | Path                           | Result                                                                                                                                             |
| ------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /leetcode/link                 | `{username}` -> verified public profile `{username,counts:{easy,medium,hard}}`; duplicate username or switching an already-linked user returns 409 |
| GET    | /leetcode/account              | Stored profile or `{linked:false}`                                                                                                                 |
| POST   | /leetcode/sync                 | Import recent accepted submissions; `{lastSyncedAt,minutesRemaining,imported}`                                                                     |
| GET    | /leetcode/sync                 | `{lastSyncedAt,minutesRemaining}`; minutes round upward                                                                                            |
| GET    | /dashboard?range=week or 30d   | `{range,leetcode:{linked,username,counts}}`; unlinked omits username/counts                                                                        |
| GET    | /leaderboard?period=week       | `{period,top,you}`; top four plus current user's rank; month/all return 400                                                                        |
| GET    | /problems/:slug/discussion     | `{problem:{slug,title,difficulty},unlocked}`; never contains posts/counts                                                                          |
| GET    | /problems/:slug/posts?offset=0 | Newest first, at most 50 posts; requires permanent unlock                                                                                          |
| GET    | /problems/:slug/posts/:id      | One post; same gate                                                                                                                                |
| POST   | /problems/:slug/posts          | Create post, 201; same gate                                                                                                                        |
| PUT    | /problems/:slug/posts/:id      | Replace own post; same gate                                                                                                                        |
| DELETE | /problems/:slug/posts/:id      | Delete own post, 204; same gate                                                                                                                    |

Posts require `code` (nonblank, max 20,000 characters), `language`, `timeComplexity`, and `spaceComplexity`. Optional title (nonblank, max 100) defaults to `Solution`; optional comment (max 2,000) defaults to empty. Code whitespace is preserved. Allowed languages: python, java, cpp, c, csharp, javascript, typescript, go. Allowed complexities: O(1), O(log n), O(n), O(n log n), O(n^2), O(n^3), O(2^n), O(n!). These match Santiago's current editor. Likes/favorites are not implemented.

Errors are `{error,kind}`. Locked reads/writes return 403 without post content or counts. Missing/non-owned post mutations return 404. Invalid input returns 400. Provider errors distinguish not_found (404), private (422), unavailable (503). Cooldown returns 429 with minutesRemaining and Retry-After. Additional provider-request rate limiting returns 429.

## Sync and scoring guarantees

Sync holds a per-user database row lock and uses one transaction for all imported problems/solves, unlocks, score recomputation, and last_synced_at. Overlapping requests cannot both bypass cooldown. A failed provider call, invalid submission, or database write rolls back the whole import. Failed sync does not advance last_synced_at. Exact 15-minute elapsed time permits retry. An existing linked account cannot be switched to import another person's solves.

Accepted solves deduplicate on (user, problem) and preserve the earliest known timestamp. Scores recompute after successful sync using 1/3/5 points for easy/medium/hard, only live-source first-known solves within the current Monday-based UTC week. A later repeat of a known solve adds no points. Equal positive scores sort by the earliest timestamp at which that score was reached; equal timestamps share rank. Zero scores share rank. The leaderboard joins only the active week, so the new week starts at zero without a scheduled reset.

The dashboard counts stored live-source first-known solves in the UTC week or rolling 30 days. Demo-source rows do not count or grant live unlocks. A successfully verified solve creates a permanent unlock; subsequent syncs never remove it.

## Connector boundary and limitations

`LeetCodeConnector` is injected through `createApp` for deterministic tests and replacement with Hussain's connector. The default live adapter uses the public LeetCode GraphQL endpoint with 8-second per-request timeouts and a 20-second overall recent-submission deadline. It fetches up to 20 recent accepted submissions plus difficulty metadata. No provider password or session cookie is collected; there is no silent demo fallback.

Public profile lookup confirms that a profile exists, not that the signed-in person owns it. Linking is therefore a public-username association, not verified ownership. The public recent feed is incomplete: it cannot prove first lifetime solves or recover every historical solve. Scores currently mean earliest solves observed by StackSprint; an unseen older solve can cause an apparent first solve to be counted until older evidence is imported. This limitation must be resolved with a fuller trusted history source before claiming lifetime-repeat-proof rankings. Empty/truncated provider feeds do not delete existing data.

The live adapter's network behavior is tested with mocked provider responses. A live LeetCode smoke test is still required where outbound access is available; provider schema changes or blocking return an unavailable error. The frontend branches still use stubs until wired to these endpoints. Their existing TypeScript data shapes are the reference contract, with no server support yet for favorites, likes, month/all-time leaderboards.

## Validation

Run `npm run check`, `npm run db:migrate`, `npm run test:db`, and `npm run test:e2e`. New tests cover provider failures, UTC boundaries, rounded cooldowns, concurrent sync, deduplication, partial-import rollback, dashboard windows, leaderboard ties/new-week reset, permanent unlocks, locked content protection, post ownership, and enum validation. Database suites use independent temporary schemas and TEST_DATABASE_URL only.
