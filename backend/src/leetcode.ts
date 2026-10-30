export type Difficulty = "easy" | "medium" | "hard";
export type Counts = Record<Difficulty, number>;
export type Profile = { username: string; counts: Counts };
export type Solve = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  solvedAt: string;
  submissionId: string;
};
export interface LeetCodeConnector {
  profile(username: string): Promise<Profile>;
  recent(username: string): Promise<Solve[]>;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public kind: string,
    message: string,
    public minutesRemaining = 0,
  ) {
    super(message);
  }
}
const unavailable = () =>
  new ApiError(
    503,
    "unavailable",
    "LeetCode is unavailable. Your existing data is unchanged.",
  );
export function createLeetCodeConnector(
  request: typeof fetch = fetch,
): LeetCodeConnector {
  async function query(
    query: string,
    variables: Record<string, unknown>,
    deadline = Date.now() + 8000,
  ): Promise<Record<string, unknown>> {
    try {
      if (Date.now() >= deadline) throw unavailable();
      const response = await request("https://leetcode.com/graphql/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(Math.min(8000, deadline - Date.now())),
        redirect: "error",
      });
      if (!response.ok) throw unavailable();
      const result = (await response.json()) as {
        data?: Record<string, unknown>;
        errors?: unknown[];
      };
      if (!result.data || result.errors?.length) throw unavailable();
      return result.data;
    } catch {
      throw unavailable();
    }
  }
  return {
    async profile(username) {
      const data = await query(
        `query($username: String!) { matchedUser(username: $username) { username submitStatsGlobal { acSubmissionNum { difficulty count } } } }`,
        { username },
      );
      if (data.matchedUser === null)
        throw new ApiError(404, "not_found", "LeetCode profile not found.");
      const user = data.matchedUser as
        | {
            username?: unknown;
            submitStatsGlobal?: {
              acSubmissionNum?: { difficulty: string; count: number }[];
            };
          }
        | undefined;
      if (!user || typeof user.username !== "string") throw unavailable();
      if (!user.submitStatsGlobal)
        throw new ApiError(
          422,
          "private",
          "LeetCode profile statistics are private.",
        );
      const entries = user.submitStatsGlobal.acSubmissionNum;
      if (!Array.isArray(entries)) throw unavailable();
      const counts: Counts = { easy: 0, medium: 0, hard: 0 };
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const row = entries.find(
          (x) => x.difficulty?.toLowerCase() === difficulty,
        );
        if (!row || !Number.isSafeInteger(row.count) || row.count < 0)
          throw unavailable();
        counts[difficulty] = row.count;
      }
      return { username: user.username, counts };
    },
    async recent(username) {
      const deadline = Date.now() + 20000;
      const data = await query(
        `query($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`,
        { username, limit: 20 },
        deadline,
      );
      const rows = data.recentAcSubmissionList as {
        id: string;
        title: string;
        titleSlug: string;
        timestamp: string;
      }[];
      if (!Array.isArray(rows) || rows.length > 20) throw unavailable();
      const metadata = new Map<string, Difficulty>();
      const result: Solve[] = [];
      for (const row of rows) {
        if (
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.titleSlug) ||
          typeof row.title !== "string" ||
          !row.title.trim() ||
          typeof row.id !== "string" ||
          !/^\d+$/.test(row.id)
        )
          throw unavailable();
        const timestamp = Number(row.timestamp) * 1000;
        if (
          !Number.isFinite(timestamp) ||
          timestamp <= 0 ||
          timestamp > Date.now()
        )
          throw unavailable();
        let difficulty = metadata.get(row.titleSlug);
        if (!difficulty) {
          const detail = await query(
            `query($titleSlug: String!) { question(titleSlug: $titleSlug) { difficulty } }`,
            { titleSlug: row.titleSlug },
            deadline,
          );
          const value = (
            detail.question as { difficulty?: string } | null
          )?.difficulty?.toLowerCase();
          if (value !== "easy" && value !== "medium" && value !== "hard")
            throw unavailable();
          difficulty = value;
          metadata.set(row.titleSlug, difficulty);
        }
        result.push({
          slug: row.titleSlug,
          title: row.title,
          difficulty,
          solvedAt: new Date(timestamp).toISOString(),
          submissionId: row.id,
        });
      }
      return result;
    },
  };
}
export function weekStart(now: Date): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}
export function minutesRemaining(last: Date | null, now: Date): number {
  return last
    ? Math.max(0, Math.ceil((last.getTime() + 900000 - now.getTime()) / 60000))
    : 0;
}
export const languages = [
  "python",
  "java",
  "cpp",
  "c",
  "csharp",
  "javascript",
  "typescript",
  "go",
];
export const complexities = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n^2)",
  "O(n^3)",
  "O(2^n)",
  "O(n!)",
];
export function parsePost(input: unknown) {
  if (!input || typeof input !== "object")
    throw new ApiError(400, "invalid", "Invalid post.");
  const p = input as Record<string, unknown>;
  if (
    typeof p.code !== "string" ||
    !p.code.trim() ||
    p.code.length > 20000 ||
    typeof p.language !== "string" ||
    !languages.includes(p.language) ||
    typeof p.timeComplexity !== "string" ||
    !complexities.includes(p.timeComplexity) ||
    typeof p.spaceComplexity !== "string" ||
    !complexities.includes(p.spaceComplexity) ||
    (p.title !== undefined &&
      (typeof p.title !== "string" ||
        !p.title.trim() ||
        p.title.length > 100)) ||
    (p.comment !== undefined &&
      (typeof p.comment !== "string" || p.comment.length > 2000))
  )
    throw new ApiError(
      400,
      "invalid",
      "Provide code, language, and valid Time and Space Big-O values.",
    );
  return {
    code: p.code,
    language: p.language,
    timeComplexity: p.timeComplexity,
    spaceComplexity: p.spaceComplexity,
    title: typeof p.title === "string" ? p.title.trim() : "Solution",
    comment: typeof p.comment === "string" ? p.comment.trim() : "",
  };
}
