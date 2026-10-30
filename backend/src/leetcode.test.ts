import { describe, it, expect, vi } from "vitest";
import {
  createLeetCodeConnector,
  minutesRemaining,
  weekStart,
  parsePost,
} from "./leetcode.js";
const response = (data: unknown) => new Response(JSON.stringify({ data }));
describe("LeetCode provider boundary", () => {
  it("normalizes profile counts", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        matchedUser: {
          username: "Coder",
          submitStatsGlobal: {
            acSubmissionNum: [
              { difficulty: "Easy", count: 4 },
              { difficulty: "Medium", count: 2 },
              { difficulty: "Hard", count: 1 },
            ],
          },
        },
      }),
    );
    expect(await createLeetCodeConnector(request).profile("Coder")).toEqual({
      username: "Coder",
      counts: { easy: 4, medium: 2, hard: 1 },
    });
    expect(request.mock.calls[0]?.[0]).toBe("https://leetcode.com/graphql/");
  });
  it("distinguishes missing, private, and unavailable responses", async () => {
    for (const [data, kind] of [
      [{ matchedUser: null }, "not_found"],
      [{ matchedUser: { username: "x", submitStatsGlobal: null } }, "private"],
      [{}, "unavailable"],
    ] as const) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(response(data));
      await expect(
        createLeetCodeConnector(request).profile("x"),
      ).rejects.toMatchObject({ kind });
    }
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("timeout"));
    await expect(
      createLeetCodeConnector(request).profile("x"),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("fetches metadata once per problem and returns accepted timestamps", async () => {
    const row = {
      id: "1",
      title: "Two Sum",
      titleSlug: "two-sum",
      timestamp: "1700000000",
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ recentAcSubmissionList: [row, row] }))
      .mockResolvedValueOnce(response({ question: { difficulty: "Easy" } }));
    const result = await createLeetCodeConnector(request).recent("x");
    expect(result).toHaveLength(2);
    expect(result[0]?.difficulty).toBe("easy");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("fails the whole fetch if a problem cannot be resolved", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          recentAcSubmissionList: [
            { id: "1", title: "X", titleSlug: "x", timestamp: "1700000000" },
          ],
        }),
      )
      .mockResolvedValueOnce(response({ question: null }));
    await expect(
      createLeetCodeConnector(request).recent("x"),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
});
it("uses UTC Monday regardless of host time zone", () => {
  expect(weekStart(new Date("2026-10-25T23:59:59Z")).toISOString()).toBe(
    "2026-10-19T00:00:00.000Z",
  );
  expect(weekStart(new Date("2026-10-26T00:00:00Z")).toISOString()).toBe(
    "2026-10-26T00:00:00.000Z",
  );
  expect(
    minutesRemaining(
      new Date("2026-10-26T00:00:00Z"),
      new Date("2026-10-26T00:14:59Z"),
    ),
  ).toBe(1);
  expect(
    minutesRemaining(
      new Date("2026-10-26T00:00:00Z"),
      new Date("2026-10-26T00:15:00Z"),
    ),
  ).toBe(0);
});
it("validates all three enum fields and preserves code whitespace", () => {
  const draft = {
    code: "  code\n",
    language: "python",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  };
  expect(parsePost(draft).code).toBe("  code\n");
  for (const field of ["language", "timeComplexity", "spaceComplexity"])
    expect(() => parsePost({ ...draft, [field]: "invalid" })).toThrow();
});

it("normalizes provider HTTP errors, GraphQL errors and malformed counts", async () => {
  for (const response of [
    new Response("blocked", { status: 403 }),
    new Response("slow down", { status: 429 }),
    new Response("down", { status: 503 }),
    new Response("not JSON"),
    new Response(JSON.stringify({ errors: [{ message: "schema changed" }] })),
    new Response(
      JSON.stringify({
        data: {
          matchedUser: {
            username: "x",
            submitStatsGlobal: {
              acSubmissionNum: [{ difficulty: "Easy", count: -1 }],
            },
          },
        },
      }),
    ),
  ]) {
    await expect(
      createLeetCodeConnector(async () => response).profile("x"),
    ).rejects.toMatchObject({ status: 503, kind: "unavailable" });
  }
});

it("aborts a hung provider request at the real request deadline", async () => {
  const request: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      );
    });
  await expect(
    createLeetCodeConnector(request).profile("x"),
  ).rejects.toMatchObject({ kind: "unavailable" });
}, 12000);
