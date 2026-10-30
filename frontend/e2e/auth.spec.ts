import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { password } from "./helpers.js";

test("F-09: real signup, signout, rejected password, signin and persisted dashboard session", async ({
  page,
}) => {
  const email = `signup-${randomUUID()}@example.com`;
  await page.goto("/");
  await expect(page).toHaveURL("/signin");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") && response.status() === 201,
  );
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const { user } = await (await created).json();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Connect LeetCode to see your stats", { exact: true }),
  ).toBeVisible();
  const token = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("stacksprint.session")!)
        .accessToken as string,
  );
  const me = await page.request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(await me.json()).toEqual({ user: { id: user.id, email } });
  await page.goto("/profile");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/signin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Incorrect email or password.",
  );
  await expect(page).toHaveURL("/signin");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/");
  await expect(page).toHaveURL("/signin");
});
