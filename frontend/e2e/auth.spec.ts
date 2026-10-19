import { expect, test } from "@playwright/test";

test("sign up, sign out, and sign in to the dashboard", async ({ page }) => {
  const email = "smoke@example.com";
  const password = "SmokeTest123!";

  await page.goto("/");
  await expect(page).toHaveURL("/signin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeHidden();

  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${email}.`, { exact: true }),
  ).toBeVisible();

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
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${email}.`, { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${email}.`, { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/");
  await expect(page).toHaveURL("/signin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeHidden();
});
