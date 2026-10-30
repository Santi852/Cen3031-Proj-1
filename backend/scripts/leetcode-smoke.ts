import { ApiError, createLeetCodeConnector } from "../src/leetcode.js";

const username = process.argv[2];
if (!username || !/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
  console.error("Usage: npm run smoke:leetcode -- public-username");
  process.exitCode = 2;
} else {
  const connector = createLeetCodeConnector();
  try {
    const profile = await connector.profile(username);
    const recent = await connector.recent(username);
    console.log(
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          mode: "live",
          status: "passed",
          username: profile.username,
          counts: profile.counts,
          recentAccepted: recent.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          mode: "live",
          status: "unavailable",
          kind: error instanceof ApiError ? error.kind : "unexpected",
          message: error instanceof Error ? error.message : "Request failed.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
