# Sprint 0 foundation closeout - Matias Camaran

Verified October 29, 2026 (America/New_York), against main commit `8d630daab97043b6fb10ceb19545478d30552ea5`. Correction: F-prefixed issues belong to Sprint 0. The prior version mislabeled them as Sprint 1. This record covers only foundation work; 1-prefixed tasks belong to Sprint 1.

## Completed work

All four foundation issues are closed as completed and their project cards are Done. The code and task template are merged into main.

| Item | Points | Delivered work                                                                               | Evidence                                                                                                                        |
| ---- | -----: | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| F-01 |      3 | React/TypeScript frontend, Node/TypeScript backend, shared lint and formatting configuration | [Issue #14](https://github.com/Santi852/Cen3031-Proj-1/issues/14), [PR #78](https://github.com/Santi852/Cen3031-Proj-1/pull/78) |
| F-02 |      1 | Populated project board and acceptance-criteria task template                                | [Issue #15](https://github.com/Santi852/Cen3031-Proj-1/issues/15), [PR #79](https://github.com/Santi852/Cen3031-Proj-1/pull/79) |
| F-05 |      5 | PostgreSQL schema and migration tooling                                                      | [Issue #18](https://github.com/Santi852/Cen3031-Proj-1/issues/18), [PR #80](https://github.com/Santi852/Cen3031-Proj-1/pull/80) |
| F-06 |      5 | Signup/signin API, password hashing, token validation, and authentication middleware         | [Issue #19](https://github.com/Santi852/Cen3031-Proj-1/issues/19), [PR #81](https://github.com/Santi852/Cen3031-Proj-1/pull/81) |

The completed foundation subtotal is **14 points**. This is Matias's contribution subtotal, not a calculation of the team's sprint velocity.

## Project board

The [StackSprint board](https://github.com/users/matiascamaran/projects/1) contains all 64 backlog issues (#14-#77) plus the eight original planning issues (#5-#12), for 72 cards at verification. Every backlog issue has one accountable assignee; existing owners were preserved. The required Backlog, Ready, In progress, In review, and Done stages are present.

Filtering the board to `assignee:matiascamaran F-` shows four Done cards and no remaining foundation cards in the other stages. Both F-02 acceptance criteria are checked. Other teammates' issue states were preserved; this record does not certify their delivery.

## Validation

The fresh [PR #79 CI run](https://github.com/Santi852/Cen3031-Proj-1/actions/runs/40977656922) passed on Node 22.23.3. The subsequent [main-branch CI run](https://github.com/Santi852/Cen3031-Proj-1/actions/runs/40977848115) also passed after the merge.

- Clean dependency installation and setup passed.
- Lint, formatting, TypeScript checks, and both production builds passed.
- All 55 tests passed: 25 backend tests, 29 database/authentication tests, and one Chromium browser smoke test.
- Database migrations passed against the CI PostgreSQL service.

These are GitHub CI results. The earlier local run was partial because this environment could not bind the API port (`listen EPERM`); it is not used as evidence of a full local pass. This closeout change adds documentation only.

## Demo rehearsal

Use the team-approved main branch on a computer with Node 22 and PostgreSQL 17. Keep any existing local credentials and configuration. The detailed setup and API contract are in [the backend guide](../backend/README.md).

1. Run `nvm install`, `nvm use`, `npm ci`, and `npm run setup` from the repository root.
2. If `backend/.env` is absent, copy `backend/.env.example` to it. Configure a local `DATABASE_URL`, a private random `JWT_SECRET` of at least 32 UTF-8 bytes, and `FRONTEND_ORIGIN=http://localhost:5173`. The placeholder signing secret is rejected. Do not display this file during the presentation.
3. Start PostgreSQL, using `docker compose up -d --wait postgres` if Docker is available. Run `npm run db:migrate`.
4. Run `npm run dev:backend` and `npm run dev:frontend` in separate terminals. Open `http://localhost:5173`.
5. Show the browser's `API: ok` footer and the successful `GET /api/health` response. Explain that this proves browser-to-API connectivity, while the health endpoint does not query PostgreSQL.
6. For a separate backend demonstration, run the snippet below in another terminal against the local development API. It creates one uniquely named demo user, signs in, checks the authenticated identity, and verifies that a wrong password is rejected. It prints statuses and pass/fail results, never the token or password. It leaves that demo account in the local database.

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = 'http://localhost:3001';
const email = `sprint0-demo-${randomUUID()}@example.com`;
const password = `Demo-${randomUUID()}`;
async function post(path, body) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}
const signup = await post('/api/auth/signup', { email, password });
assert.equal(signup.status, 201, 'Signup should return 201');
const created = await signup.json();
const signin = await post('/api/auth/signin', { email, password });
assert.equal(signin.status, 200, 'Signin should return 200');
const session = await signin.json();
const me = await fetch(`${base}/api/auth/me`, {
  headers: { Authorization: `Bearer ${session.accessToken}` },
  signal: AbortSignal.timeout(10000),
});
assert.equal(me.status, 200, 'Authenticated lookup should return 200');
const current = await me.json();
assert.equal(current.user.id, created.user.id);
assert.equal(current.user.email, email);
const rejected = await post('/api/auth/signin', {
  email, password: 'intentionally-wrong-password',
});
assert.equal(rejected.status, 401, 'Wrong password should return 401');
console.log('PASS: signup 201; signin 200; current user 200; matching identity; wrong password 401.');
JS
```

The snippet was syntax-checked during this closeout but could not be executed here because the local API cannot listen on a port. Rehearse on the presenting computer before recording.

On the verified main branch, the frontend authentication still uses its browser-only stub. Do not present its sign-in as proof of PostgreSQL-backed login. Santiago's frontend API connection remains in the separate, open [PR #82](https://github.com/Santi852/Cen3031-Proj-1/pull/82) as of this verification. LeetCode linking, synchronization, populated leaderboards, and discussion permissions are outside this confirmed foundation scope.

## Contribution summary

My completed foundation work includes the shared project setup, PostgreSQL database and migrations, the authentication API with password hashing and token validation, and the populated project board with an acceptance-criteria task template. All four issues are Done, and the fresh CI run passed all 55 tests.

This technical record does not certify scrum attendance, submit coursework, or claim the whole team's sprint is finished. Release 1 LeetCode features remain outside this foundation scope.
