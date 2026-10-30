# StackSprint frontend

React, TypeScript, and Vite provide the app shell, routes, and initial sign-in/sign-up pages. Authentication uses the real backend signup/signin API. The browser stores the expiring session and sends its bearer token to protected APIs.

Follow the [repository setup instructions](../README.md#local-setup) to install the pinned Node.js version and all dependencies. From the repository root, start `npm run dev:backend` and `npm run dev:frontend` in separate terminals. Open http://localhost:5173; the shared footer shows `API: ok` when the API is running on port `3001`.

## Checks

Run `npm run check` from the repository root for shared lint/format checks, TypeScript checks, production builds, and API tests. ESLint and Prettier configuration live at the repository root.

For browser acceptance tests, follow the [Release 1 demo guide](../docs/RELEASE1_DEMO.md). Set `E2E_DATABASE_URL` to a separate database ending `_e2e`, install Chromium, and run `npm run test:e2e` from the root. Playwright migrates its database and starts separate API/frontend servers.

The root `npm run build` command writes frontend assets to `frontend/dist`. To preview them locally, run `npm run preview --prefix frontend` from the repository root.
