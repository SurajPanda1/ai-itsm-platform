import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests.");
  await page.goto("/");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await expect(page.getByRole("heading", { name: /incidents/i })).toBeVisible();
});

test("homepage modules and analytics are reachable", async ({ page }) => {
  await expect(page.getByText("Incidents").first()).toBeVisible();
  await page.getByText("Service requests").click();
  await expect(page.getByRole("heading", { name: /service requests/i })).toBeVisible();
  await page.getByText("Analytics Console").click();
  await expect(page.getByRole("heading", { name: /analytics console/i })).toBeVisible();
});

test("admin service catalogue surfaces are reachable", async ({ page }) => {
  await page.getByText("Admin Console").click();
  await expect(page.getByRole("heading", { name: /admin console/i })).toBeVisible();
  await page.getByRole("button", { name: /service catalogue/i }).click();
  await expect(page.getByRole("button", { name: /catalogue list/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /approval rule list/i })).toBeVisible();
});
