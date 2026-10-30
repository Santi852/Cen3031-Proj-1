import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("sign up through the API, sign out, and sign in to the dashboard", async ({
  page,
}) => {
  const email = `smoke-${randomUUID()}@example.com`;
  const password = "SmokeTest123!";

  await page.goto("/");
  await expect(page).toHaveURL("/signin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeHidden();

  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  const signup = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signup") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const signupResponse = await signup;
  expect(signupResponse.status()).toBe(201);
  const { user, accessToken } = await signupResponse.json();
  expect(user.email).toBe(email);
  expect(accessToken).toEqual(expect.any(String));
  const me = await page.request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(me.status()).toBe(200);
  expect(await me.json()).toEqual({ user });

  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Connect LeetCode to see your stats", { exact: true }),
  ).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/signin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Incorrect email or password.",
  );
  await expect(page).toHaveURL("/signin");

  await page.getByLabel("Password", { exact: true }).fill(password);
  const signin = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/signin") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const signinResponse = await signin;
  expect(signinResponse.status()).toBe(200);
  expect((await signinResponse.json()).user).toEqual(user);
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Connect LeetCode to see your stats", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("Connect LeetCode to see your stats", { exact: true }),
  ).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/");
  await expect(page).toHaveURL("/signin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeHidden();
});
