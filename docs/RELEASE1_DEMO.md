# Release 1 demo and checks — 1-25

## Automated rehearsal

Use Node 22 from `.nvmrc` and PostgreSQL 17 (local verification also passed on PostgreSQL 18). Install dependencies with `npm ci` and `npm run setup`.

Create a disposable database named `stacksprint_e2e` with your local PostgreSQL role, then set its URL:

```bash
export E2E_DATABASE_URL='postgres://YOUR_ROLE:YOUR_PASSWORD@localhost:5432/stacksprint_e2e'
npm run test:e2e
```

Install Chromium first with `npx playwright install chromium` from `frontend/`. If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` uses it instead. Playwright migrates only the explicitly supplied `_e2e` database, starts separate servers on ports 3002/5174, and shuts them down after testing. Each run uses unique accounts; it does not clear an existing application's tables.

The six tests rehearse signup/signin/signout, persisted sessions, locked → fixture solve → unlocked discussions, code/tag validation, post create/edit/delete, owner-only access, 1/3/5 scoring, cooldowns, link errors, timezone persistence and dashboard failure/retry. Successful flows use the actual API and PostgreSQL. Only the external LeetCode source is replaced by explicit fixtures. One dashboard test deliberately aborts a request to verify failure/recovery.

## Presentation walkthrough

1. Start a separate demo database ending `_demo`. Set `DATABASE_URL` to it, `LEETCODE_MODE=demo`, and a private random JWT_SECRET in your ignored `backend/.env`. Keep `.env` off screen. Run `npm run db:migrate`, then backend and frontend development servers in separate terminals.
2. Open localhost:5173. Point out the visible **Demo data** banner. Create an account, show the dashboard, sign out, demonstrate a rejected password, and sign in again.
3. Link a unique username such as `demo-hussain`. Show the sample difficulty counts. Use `missing-user`, `private-user`, or `down` with a separate unlinked demo account to show error states.
4. Open `/problem/two-sum`: discussion starts locked. Click **I just solved it**. The fixture sync imports Easy/Medium/Hard solves and the server unlocks the discussion.
5. Create a solution with language and both Big-O tags. Show saved code formatting, edit the post, and delete it with confirmation. The tests additionally verify that a locked user cannot access posts and another author cannot edit/delete them.
6. Show **9 pts** on the weekly leaderboard (1 + 3 + 5), dashboard counts and the refresh cooldown. Explain that fixtures are simulated and live scoring uses earliest observed solves.
7. In Profile, choose a timezone, save, reload and show persistence. Competition weeks remain Monday 00:00 UTC.
8. Show the passing check results and relevant PR. Rehearse once on the actual presenting computer before recording.

## Other verification commands

```bash
npm run check
# DATABASE_URL points to your development/demo database:
npm run db:migrate
# TEST_DATABASE_URL points to a disposable test database:
npm run test:db
```

Do not use rollback on a populated application database. The two new migrations add source isolation and timezone preferences; existing live records retain their live source and default UTC display setting. Fixture sync rejects an account with existing live solves instead of overwriting real history.
