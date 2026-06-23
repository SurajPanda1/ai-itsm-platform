import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests.");
  await page.goto("/");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await expect(page.getByText(/open tickets|service catalogue|admin console/i).first()).toBeVisible();
});

test("homepage modules and analytics are reachable", async ({ page }) => {
  await expect(page.getByRole("button", { name: /incidents/i })).toBeVisible();
  await page.getByRole("button", { name: /requests/i }).click();
  await expect(page.getByText(/service catalogue|browse catalogue|request/i).first()).toBeVisible();
  await page.getByRole("button", { name: /analytics/i }).click();
  await expect(page.getByText(/analytics console/i)).toBeVisible();
});

test("admin service catalogue surfaces are reachable", async ({ page }) => {
  await page.getByRole("button", { name: /admin console/i }).click();
  await expect(page.getByText(/admin console/i)).toBeVisible();
  await page.getByRole("button", { name: /service catalogue/i }).click();
  await expect(page.getByRole("button", { name: /catalogue list/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /approval rule list/i })).toBeVisible();
});
