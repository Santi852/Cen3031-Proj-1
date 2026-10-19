# Cen3031-Proj-1 — LeetCode Productivity App

A gamified, social platform that makes technical interview prep more engaging. Race friends on weekly leaderboards, unlock code discussions once you've solved a problem yourself, and track real coding activity across your IDE, GitHub, and LeetCode.

## Planned Features

- **Weekly Leaderboards** — Compete with friends to solve the most LeetCode problems each week.
- **Unlockable Code Discussions** — See and discuss other users' solutions to a problem, unlocked only after you've solved it yourself.
- **Activity Tracking Dashboard** — Combines the unofficial LeetCode GraphQL endpoint, the GitHub API, and IDE time-tracking plugins (e.g. WakaTime) to measure real development time and submission history.

## Project Management

Task tracking and progress live on the [StackSprint project board](https://github.com/users/matiascamaran/projects/1), using issues from this repository.

## Contributing

1. Branch off `main` for any change.
2. Open a pull request into `main`.
3. At least one approving review is required before a PR can be merged (branch protection is enabled on `main`).

## Status

The TypeScript scaffold includes a React/Vite frontend, an Express API health endpoint, shared lint/format settings, and automated checks. PostgreSQL schema and migration tooling are available; backend authentication is still pending. The frontend sign-in/sign-up flow currently uses a development-only browser storage stub.

## Local Setup

Use the Node.js version pinned in `.nvmrc` and its bundled npm. The tooling requires Node.js 22.13 or newer in the Node 22 release line. With nvm installed, run these commands from the repository root:

```bash
git clone https://github.com/Santi852/Cen3031-Proj-1.git
cd Cen3031-Proj-1

nvm install
nvm use
npm ci
npm run setup
cp backend/.env.example backend/.env
```

`npm ci` installs the shared tooling; `npm run setup` installs the backend and frontend using their separate lockfiles. Keep `backend/.env` local and never commit credentials. `PORT` defaults to `3001`; `DATABASE_URL` configures database migrations; `JWT_SECRET` is a placeholder for future authentication work. The current health endpoint does not need database credentials or a JWT secret.

Start each app in its own terminal, both from the repository root:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

The API runs at http://localhost:3001 and the frontend at http://localhost:5173. Keep the API on port `3001` for the current frontend health check and browser test. A signed-out visit redirects to sign-in; the footer should show `API: ok`.

For database setup, migrations, and database tests, follow the [database guide](backend/README.md). The current health endpoint and frontend can run without PostgreSQL.

### Checks and builds

Run these commands from the repository root:

| Command                | What it runs                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run check`        | Lint, formatting check, type checks, both builds, and backend tests         |
| `npm run lint`         | Shared ESLint rules across the backend and frontend                         |
| `npm run format:check` | Shared Prettier formatting check                                            |
| `npm run typecheck`    | Backend and frontend TypeScript checks                                      |
| `npm run build`        | Backend JavaScript in `backend/dist` and frontend assets in `frontend/dist` |
| `npm test`             | Vitest API tests                                                            |
| `npm run test:e2e`     | Playwright smoke test; starts both development servers automatically        |

Before the first browser test, run `npx playwright install chromium` from `frontend/`. Then return to the repository root and run `npm run test:e2e`. Browser tests are separate from `npm run check`.

The browser suite checks API health and the F-09 flow: create an account, sign out, reject an incorrect password, sign in, and reach the dashboard. It also verifies that a session survives a reload and signed-out visitors cannot access the dashboard. Each test runs in an isolated browser context. Authentication currently uses the frontend's browser storage stub; these tests do not verify PostgreSQL accounts or the pending F-06 API integration.

Playwright writes an HTML report to `frontend/playwright-report` and retains traces for failed tests. CI uploads the report when a check fails. Environment files such as `.env.test` and `.env.production` are ignored; only placeholder `.env.example` files should be committed.

After `npm run build`, run the compiled API with `npm start --prefix backend`. GitHub Actions (`.github/workflows/ci.yml`) validates the scaffold on pull requests and pushes to `main`.

## Development Environment and Project Proposal Plan

- [Project proposal](docs/PROJECT_PROPOSAL.md) and [PDF](docs/StackSprint_Project_Proposal.pdf)
- [Configuration management and contribution workflow](CONTRIBUTING.md)
- [Initial task backlog](https://github.com/Santi852/Cen3031-Proj-1/issues)

**Team name:** StackSprint.

| Member           | Role                                          |
| ---------------- | --------------------------------------------- |
| Santiago Ramirez | Frontend lead                                 |
| Matias Camaran   | Proposed project coordinator and backend lead |
| Hussain          | Proposed integrations and quality lead        |

The scaffold uses TypeScript, React, and Node.js; PostgreSQL integration remains planned. The proposal records the broader scope and proposed team responsibilities.
