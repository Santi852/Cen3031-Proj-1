import { expect, it } from "vitest";
import {
  localDateKey,
  formatLocalDateTime,
} from "../../frontend/src/settings/dates.js";

it("buckets UTC instants by the user's local day across midnight and DST", () => {
  for (const [instant, zone, expected] of [
    ["2026-10-26T00:00:00Z", "America/New_York", "2026-10-25"],
    ["2026-10-25T23:59:59Z", "Asia/Tokyo", "2026-10-26"],
    ["2026-03-08T06:59:59Z", "America/New_York", "2026-03-08"],
    ["2026-03-08T07:00:00Z", "America/New_York", "2026-03-08"],
    ["2026-11-01T05:30:00Z", "America/New_York", "2026-11-01"],
    ["2026-11-01T06:30:00Z", "America/New_York", "2026-11-01"],
    ["2026-10-26T00:00:00Z", "UTC", "2026-10-26"],
  ])
    expect(localDateKey(instant!, zone!)).toBe(expected);
});

it("uses the selected zone for display and rejects invalid instants or zones", () => {
  expect(
    formatLocalDateTime("2026-10-26T00:00:00Z", "America/New_York"),
  ).toMatch(/Oct 25, 2026/);
  expect(formatLocalDateTime("2026-10-26T00:00:00Z", "Asia/Tokyo")).toMatch(
    /Oct 26, 2026/,
  );
  expect(() => localDateKey("invalid", "UTC")).toThrow();
  expect(() => localDateKey("2026-10-26T00:00:00Z", "Mars/Olympus")).toThrow();
});
