# Cen3031-Proj-1 — LeetCode Productivity App

A gamified, social platform that makes technical interview prep more engaging. Race friends on weekly leaderboards, unlock code discussions once you've solved a problem yourself, and track real coding activity across your IDE, GitHub, and LeetCode.

## Core Features

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

Early setup phase — tech stack and architecture details are being finalized in the project proposal.

## Local Setup

Requires Node.js 22 and npm.

```bash
git clone https://github.com/Santi852/Cen3031-Proj-1.git
cd Cen3031-Proj-1

cd backend
cp .env.example .env
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Fill in real values in `backend/.env` (never commit it). The backend runs on http://localhost:3001. Start the frontend in a second terminal, then open http://localhost:5173. The page should show `API: ok` when the backend is running.

### Tests

| Command | Where | What it runs |
| --- | --- | --- |
| `npm test` | `backend/` | Vitest API tests |
| `npm run typecheck` | `backend/` | TypeScript type check |
| `npm run lint` / `npm run build` | `frontend/` | ESLint and production build |
| `npm run test:e2e` | `frontend/` | Playwright smoke test (starts both servers automatically) |

Before the first Playwright run, install the browser once with `npx playwright install chromium` in `frontend/`.

GitHub Actions (`.github/workflows/ci.yml`) runs all of these on every pull request.

## Development Environment and Project Proposal Plan

- [Project proposal](docs/PROJECT_PROPOSAL.md) and [PDF](docs/StackSprint_Project_Proposal.pdf)
- [Configuration management and contribution workflow](CONTRIBUTING.md)
- [Initial task backlog](https://github.com/Santi852/Cen3031-Proj-1/issues)

**Team name:** StackSprint.

| Member | Role |
| --- | --- |
| Santiago Ramirez | Frontend lead |
| Matias Camaran | Proposed project coordinator and backend lead |
| Hussain | Proposed integrations and quality lead |

The proposal recommends TypeScript, React, Node.js, and PostgreSQL. Stack and remaining role decisions await team agreement; the application has not yet been scaffolded. Review the proposal against the instructor's challenge statement and the assigned textbook before submission.
