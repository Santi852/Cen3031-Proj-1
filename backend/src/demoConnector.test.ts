import { expect, it } from "vitest";
import { createDemoConnector } from "./demoConnector.js";

it("provides deterministic easy, medium and hard fixture solves without network access", async () => {
  const connector = createDemoConnector(() => new Date("2026-10-29T12:00:00Z"));
  expect(await connector.profile("demo-coder")).toEqual({
    username: "demo-coder",
    counts: { easy: 1, medium: 1, hard: 1 },
  });
  const solves = await connector.recent("demo-coder");
  expect(solves.map((s) => [s.slug, s.difficulty])).toEqual([
    ["two-sum", "easy"],
    ["add-two-numbers", "medium"],
    ["trapping-rain-water", "hard"],
  ]);
  expect(await connector.recent("demo-coder")).toEqual(solves);
  expect(solves.every((s) => s.solvedAt <= "2026-10-29T12:00:00.000Z")).toBe(
    true,
  );
});

it("offers explicit missing, private and unavailable demo scenarios", async () => {
  const connector = createDemoConnector();
  for (const [username, kind] of [
    ["missing-user", "not_found"],
    ["private-user", "private"],
    ["down", "unavailable"],
  ]) {
    await expect(connector.profile(username!)).rejects.toMatchObject({ kind });
  }
});
