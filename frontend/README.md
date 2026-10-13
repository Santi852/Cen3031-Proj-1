# StackSprint frontend

React, TypeScript, and Vite provide the app shell, routes, and initial sign-in/sign-up pages. Authentication currently uses a development-only browser storage stub; backend authentication will replace it in a later task.

Follow the [repository setup instructions](../README.md#local-setup) to install the pinned Node.js version and all dependencies. From the repository root, start `npm run dev:backend` and `npm run dev:frontend` in separate terminals. Open http://localhost:5173; the shared footer shows `API: ok` when the API is running on port `3001`.

## Checks

Run `npm run check` from the repository root for shared lint/format checks, TypeScript checks, production builds, and API tests. ESLint and Prettier configuration live at the repository root.

For the browser smoke test, first run `npx playwright install chromium` from this directory. Then run `npm run test:e2e` from the repository root; Playwright starts both development servers.

The root `npm run build` command writes frontend assets to `frontend/dist`. To preview them locally, run `npm run preview --prefix frontend` from the repository root.
