# Hussain Release 1 Catch-up Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Complete the existing acceptance criteria for Hussain's foundation and Release 1 work.
**Architecture:** Extend the merged Express/PostgreSQL APIs and React UI, using source-labeled fixtures in a separate demo database. Persist timezone preferences and exercise real browser/API/database flows.
**Tech Stack:** Node 22, TypeScript, Express, PostgreSQL, React, Vitest, Playwright.
**Spec:** Existing issue acceptance criteria: #16, #17, #22–#25, #28, #32, #33, #36, #37, #42, #46, #47.

## Global Constraints

Preserve teammates' work and attribution; keep competition weeks Monday UTC and timestamps UTC; never silently use demo data; use disposable verification data; do not merge or submit coursework.

## Review Focus

Demo data must never grant live access or scores. Demo mode must reject production and ordinary database names. Timezone preferences must persist per user and handle DST. Browser users must be unique per run. Failed syncs must preserve data/timestamps.

### Task 1: Fixture mode
- [x] Verify baseline checks, migrations, database and browser suites.
- [x] Add failing fixture configuration and API tests.
- [x] Add backend/src/demoConnector.ts and explicit LEETCODE_MODE in config/index; source-label API responses and UI; distinguish sources in sync, score and gate persistence.
- [x] Require a separate database ending _demo or _e2e for demo startup and reject production.
- [x] Verify unit/database tests and commit.

### Task 2: Timezones
- [x] Add failing tests for authenticated GET/PUT /api/settings/timezone, per-user persistence, invalid zones, local midnight and DST.
- [x] Add users.time_zone migration, settings router, frontend preference context/form and date utilities. Update post and sync date displays while preserving UTC weekly scoring.
- [x] Verify tests and commit.

### Task 3: Acceptance tests
- [x] Update F-09 intent from hussaintaheri branch for current real-auth UI.
- [x] Add browser locked → fixture solve → unlocked, posts CRUD, scoring/cooldown, link errors and settings persistence.
- [x] Extend existing connector/scoring/API tests only where acceptance coverage is missing: actual abort deadlines, malformed responses, all difficulty points, repeats, ties and boundaries.
- [x] Run the entire suite, investigate observed failures and commit.

### Task 4: Evidence and delivery
- [x] Attempt a bounded public-provider smoke check and record its actual outcome.
- [x] Write research notes, a rehearsed release demo script and issue-to-test closeout, preserving authorship and public-feed limitations.
- [x] Run full checks/migrations/database/browser suites and diff checks.
- [x] Review the diff, resolve material findings and prepare a reviewable branch/PR without merging.
