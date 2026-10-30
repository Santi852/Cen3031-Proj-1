import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createAccount, link, signIn } from "./helpers.js";

const draft = {
  title: "Seed solution",
  code: "secret-seed-code",
  language: "typescript",
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
};

test("1-20 / 1-24 / 1-25: locked → fixture solve → unlocked, scores, cooldown and solution CRUD", async ({
  page,
  request,
}) => {
  const author = await createAccount(request);
  await link(request, author.headers);
  expect(
    (
      await request.post("/api/leetcode/sync", { headers: author.headers })
    ).status(),
  ).toBe(200);
  const seedResponse = await request.post("/api/problems/two-sum/posts", {
    headers: author.headers,
    data: draft,
  });
  expect(seedResponse.status()).toBe(201);
  const seed = await seedResponse.json();
  const viewer = await createAccount(request);
  await signIn(page, viewer.email);
  await expect(
    page.getByText(
      "Demo data · LeetCode profiles, solves and rankings are simulated.",
      { exact: true },
    ),
  ).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.headers()["x-data-source"]).toBe("demo");
  await page.goto("/link-account");
  const username = `demo-${randomUUID()}`;
  await page.getByLabel("LeetCode username").fill(username);
  await page.getByRole("button", { name: "Link account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Account linked" }),
  ).toBeVisible();
  await page.goto("/problem/two-sum");
  await expect(
    page.getByRole("heading", { name: "Discussion locked" }),
  ).toBeVisible();
  const locked = await request.get("/api/problems/two-sum/posts", {
    headers: viewer.headers,
  });
  expect(locked.status()).toBe(403);
  expect(await locked.json()).toEqual({
    error: expect.any(String),
    kind: "locked",
  });
  expect(
    (
      await request.post("/api/problems/two-sum/posts", {
        headers: viewer.headers,
        data: draft,
      })
    ).status(),
  ).toBe(403);
  await expect(page.getByText("secret-seed-code", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "I just solved it", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Solutions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Seed solution/ }).first(),
  ).toBeVisible();
  expect(
    (
      await request.put(`/api/problems/two-sum/posts/${seed.id}`, {
        headers: viewer.headers,
        data: draft,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.delete(`/api/problems/two-sum/posts/${seed.id}`, {
        headers: viewer.headers,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/problems/two-sum/posts", {
        headers: viewer.headers,
        data: { code: "x" },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole("link", { name: "Write a post", exact: true }).click();
  await page
    .getByRole("button", { name: "Post solution", exact: true })
    .click();
  await expect(
    page.getByText("Pick the language you used.", { exact: true }),
  ).toBeVisible();
  const code = "function solve() {\n  return 42;\n}\n";
  await page.getByLabel("Title", { exact: true }).fill("Browser solution");
  await page.getByLabel("Language", { exact: true }).selectOption("typescript");
  await page
    .getByLabel("Time complexity", { exact: true })
    .selectOption("O(n)");
  await page
    .getByLabel("Space complexity", { exact: true })
    .selectOption("O(1)");
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Post solution", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser solution", exact: true }),
  ).toBeVisible();
  const postId = page.url().split("/").at(-1)!;
  const saved = await request.get(`/api/problems/two-sum/posts/${postId}`, {
    headers: viewer.headers,
  });
  expect((await saved.json()).code).toBe(code);
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Edited browser solution");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edited browser solution", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete", exact: true }).click();
  await expect(page).toHaveURL("/problem/two-sum");
  expect(
    (
      await request.get(`/api/problems/two-sum/posts/${postId}`, {
        headers: viewer.headers,
      })
    ).status(),
  ).toBe(404);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Refresh available in/ }),
  ).toBeDisabled();
  const cooldown = await request.post("/api/leetcode/sync", {
    headers: viewer.headers,
  });
  expect(cooldown.status()).toBe(429);
  expect((await cooldown.json()).minutesRemaining).toBe(15);
  await page.goto("/leaderboard");
  await expect(
    page.locator('.leaderboard-row[aria-current="true"]'),
  ).toContainText("9 pts");
  await page.goto("/problem/two-sum");
  await expect(
    page.getByRole("heading", { name: "Solutions", exact: true }),
  ).toBeVisible();
});

test("1-06 / 1-25: missing, private, unavailable and duplicate profiles show real API errors", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);
  await signIn(page, account.email);
  await page.goto("/link-account");
  for (const [username, message] of [
    ["missing-user", "We could not find a LeetCode account"],
    ["private-user", "That profile is private"],
    ["down", "LeetCode isn't responding right now"],
  ]) {
    await page.getByLabel("LeetCode username").fill(username!);
    await page
      .getByRole("button", { name: "Link account", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(message!);
  }
  const owner = await createAccount(request);
  const taken = await link(request, owner.headers);
  await page.getByLabel("LeetCode username").fill(taken);
  await page.getByRole("button", { name: "Link account", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("already linked");
});

test("1-11: timezone persists across reload and sign-in and controls displayed dates", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);
  await signIn(page, account.email);
  await page.goto("/profile");
  const zone = page.getByLabel("Timezone", { exact: true });
  await expect(zone).toBeEnabled();
  await zone.selectOption("America/New_York");
  await page
    .getByRole("button", { name: "Save timezone", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Timezone saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(zone).toHaveValue("America/New_York");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn(page, account.email);
  await page.goto("/profile");
  await expect(zone).toHaveValue("America/New_York");
  await link(request, account.headers);
  expect(
    (
      await request.post("/api/leetcode/sync", { headers: account.headers })
    ).status(),
  ).toBe(200);
  await page.goto("/");
  await expect(page.locator("time[datetime]")).toHaveAttribute(
    "title",
    /America\/New_York/,
  );
});

test("1-25: dashboard request failure is visible and retry recovers saved data", async ({
  page,
  request,
}) => {
  const account = await createAccount(request);
  await signIn(page, account.email);
  // Failure injection only; successful responses always come from the real API.
  await page.route("**/api/dashboard?*", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Can't reach the server");
  await page.unroute("**/api/dashboard?*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("Connect LeetCode to see your stats", { exact: true }),
  ).toBeVisible();
});
