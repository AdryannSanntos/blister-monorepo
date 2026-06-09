import { test as base, type Page } from "@playwright/test";

const DEMO_EMAIL = process.env.E2E_EMAIL ?? "negocio@blister.com.br";
const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "Negocio@123456";

async function login(page: Page) {
  await page.goto("/auth/login");
  const emailInput = page.getByRole("textbox", { name: /email/i });
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(DEMO_EMAIL);
  await passwordInput.fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
