import { defineConfig, devices } from "@playwright/test";

// Browser acceptance tests use their own migrated database and explicit fixtures.
// They must never attach to an already-running development server.
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_e2e"))
  throw new Error(
    "Set E2E_DATABASE_URL to a separate PostgreSQL database ending _e2e.",
  );
const frontend = "http://127.0.0.1:5174";
const backend = "http://127.0.0.1:3002";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: frontend,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHANNEL === "chrome"
          ? { channel: "chrome" }
          : {}),
      },
    },
  ],
  webServer: [
    {
      command:
        "npm run db:migrate --prefix ../backend && npm run dev --prefix ../backend",
      url: `${backend}/api/health`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: databaseUrl,
        LEETCODE_MODE: "demo",
        NODE_ENV: "test",
        PORT: "3002",
        FRONTEND_ORIGIN: frontend,
        JWT_SECRET: "e2e-only-disposable-signing-key-at-least-32-bytes",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
      url: frontend,
      reuseExistingServer: false,
      env: { STACKSPRINT_API_URL: backend },
    },
  ],
});
