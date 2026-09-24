import { expect, test } from "@playwright/test";

test("app loads and reaches the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "StackSprint" })).toBeVisible();
  await expect(page.getByText("API: ok")).toBeVisible();
});
