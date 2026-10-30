# LeetCode research — 1-01

Verified October 30, 2026. The existing connector was implemented by Matias; this closeout verifies it and adds missing coverage, explicit fixtures and reproducible evidence.

## Queries and response shapes

The server sends POST requests to `https://leetcode.com/graphql/` with JSON `{query,variables}`. It does not collect a LeetCode password or session cookie.

```graphql
query($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
}
query($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id title titleSlug timestamp
  }
}
query($titleSlug: String!) {
  question(titleSlug: $titleSlug) { difficulty }
}
```

Normalized profile: `{username,counts:{easy,medium,hard}}`. Normalized solve: `{slug,title,difficulty,solvedAt,submissionId}`, where solvedAt is an ISO UTC instant.

## Live check

`npm run smoke:leetcode -- leetcode` passed at 2026-10-30T15:30:43.815Z (11:30 a.m. New York): profile `LeetCode`, 12 Easy / 22 Medium / 11 Hard, recent accepted list empty. This proves the profile and recent-list requests worked from this computer at that time. Populated recent lists and difficulty lookup are covered by controlled provider-response tests; an empty live result does not prove complete historical access.

## Limits and fallback

- The connector requests at most 20 recent accepted submissions and fetches difficulty once per distinct problem per sync. This is not a full solve-history source.
- Profile lookup proves that the public profile exists, not that the StackSprint user owns it.
- First solves mean earliest observed solves. Repeats already recorded by StackSprint score zero. An older unobserved lifetime solve cannot be ruled out from this feed; do not claim lifetime-repeat-proof rankings.
- No guaranteed numeric provider quota was established by this spike. The app's own limits are a 15-minute user sync cooldown and 100 provider-triggering requests per IP per 15 minutes; these are not LeetCode quotas.
- Each request has an 8-second abort deadline; recent-submission work has a 20-second total deadline. HTTP blocking/rate limiting, bad JSON, GraphQL errors, timeouts and malformed results normalize to unavailable; failed syncs preserve saved data and timestamps.
- Missing profile normalizes to not_found. Missing public statistics normalize to private. This is the app's response interpretation, not a guarantee about every upstream privacy response.
- `LEETCODE_MODE=demo` explicitly selects deterministic fixtures in a separate `_demo` / `_e2e` database. UI/API identify demo data. Live errors never silently become fixtures.

LeetCode's [Terms of Service](https://leetcode.com/terms/) restrict automated access and scraping. Technical reachability is not permission for a third-party service. Use labeled fixtures for the course demonstration; any production access arrangement and any change to the completeness/ownership claims remain team decisions.
