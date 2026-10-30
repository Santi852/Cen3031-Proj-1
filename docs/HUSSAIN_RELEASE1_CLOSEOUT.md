# Hussain catch-up checklist — October 30, 2026

This verifies the report/slides against main `75c1f38` and the catch-up branch. Code complete here means ready for teammate review, not merged, board Done, or coursework submitted.

| Item | Verified result / evidence |
| --- | --- |
| F-03 (#16) | Existing `.env.example`, setup README and secret ignore rules verified; setup docs updated. |
| F-04 (#17) | Existing PR/main CI runs install/build/Vitest. Updated CI also runs the expanded browser suite with its own database. |
| F-09 (#22) | `frontend/e2e/auth.spec.ts`: real signup/signin, rejected password, dashboard, reload, signout and route guard. Updated from the original hussaintaheri branch's test intent for the current UI. |
| 1-01 (#23) | `LEETCODE_RESEARCH.md`: queries, shapes, limits, live smoke result and completeness limitations. |
| 1-02 (#24) | Matias's merged connector verified; `leetcode.test.ts` additionally covers real request timeout, HTTP/GraphQL errors and malformed input. |
| 1-03 (#25) | Explicit fixture connector, separate demo database requirement, API source labels, demo banner and persisted source isolation. |
| 1-06 (#28) | Existing connector/linking API tests plus browser missing/private/unavailable/duplicate cases and timeout coverage. |
| 1-10 (#32) | Existing API tests verify cooldown/concurrent requests, rollback after partial failure and repeat-sync deduplication. |
| 1-11 (#33) | Persisted per-user timezone API/Profile setting, local date bucketing/display tests across midnight/DST and browser persistence. |
| 1-14 (#36) | Existing scoring awards 1/3/5 for first observed solves in the UTC week and zero for known repeats. Tested, but complete lifetime-history verification remains unavailable from the public feed. Keep this limitation visible; do not claim stronger verification. |
| 1-15 (#37) | Existing and extended API tests cover UTC boundaries, repeats, all difficulties, earliest-reached ties and equal-time shared ranks. |
| 1-20 (#42) | Existing locked API protection plus real browser locked → fixture sync → unlocked. Demo unlocks cannot grant live access. |
| 1-24 (#46) | Existing API tests plus browser validation, own-post CRUD, missing-tag rejection and non-owner mutation rejection. |
| 1-25 (#47) | `RELEASE1_DEMO.md` and six passing browser scenarios. Actual presenting-computer rehearsal and team review remain human steps. |

## Verification

Local Node 22.23.3 / PostgreSQL 18 / installed Google Chrome:

- `npm run check`: lint, format, type checks, both builds and 38 unit tests passed.
- Real migrations passed, including repeated up and temporary-schema rollback/reapply.
- `npm run test:db`: 44 database/API tests passed.
- `npm run test:e2e`: 6 browser tests passed.
- Live profile/recent-list smoke check passed; the selected public profile returned an empty recent list.
- Secret ignore checks and `git diff --check` passed.

Existing merged foundation/auth/backend/tests are the team's prior work, including Matias's PR #87 and Santiago's frontend/API integration. This change adds the missing fixture/timezone/browser/research closeout and extra acceptance coverage; it does not claim Hussain authored the earlier work.

The initial local baseline exposed a PostgreSQL 18 RESTRICT SQLSTATE difference (23001 versus 23503 on PostgreSQL 17). The test still requires rejection and preserved solve evidence, and now accepts both legitimate constraint error codes. Browser tests initially lacked an installed bundled Chromium; local verification uses installed Chrome, while CI installs Chromium.

## Before calling the whole submission finished

Have a teammate review and merge the PR, then update issue/project states using the linked evidence. Reconcile report/slides labels: F-xx is foundation/Sprint 0; 1-xx is Release 1/Sprint 1. Report current tests, real auth integration and any remaining scope limitations. Do not retrospectively claim Oct. 30 changes were complete on Oct. 28.

The Oct. 28 workbook and Oct. 26 slides were provided as pasted text only, so their source files were not edited. This checklist does not certify attendance, retrospective participation, course uploads or the instructor's rubric.
