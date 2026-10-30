import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const password = "BrowserTest123!";
export async function createAccount(request: APIRequestContext) {
  const email = `e2e-${randomUUID()}@example.com`;
  const response = await request.post("/api/auth/signup", {
    data: { email, password },
  });
  expect(response.status()).toBe(201);
  const session = (await response.json()) as {
    user: { id: string; email: string };
    accessToken: string;
  };
  return {
    ...session,
    email,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  };
}
export async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
}
export async function link(
  request: APIRequestContext,
  headers: Record<string, string>,
  username = `demo-${randomUUID()}`,
) {
  const response = await request.post("/api/leetcode/link", {
    headers,
    data: { username },
  });
  expect(response.status()).toBe(200);
  return username;
}
