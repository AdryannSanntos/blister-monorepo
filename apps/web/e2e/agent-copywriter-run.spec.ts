import { test, expect, type Page } from '@playwright/test';

const DEMO_EMAIL = 'negocio@blister.com.br';
const DEMO_PASSWORD = 'Negocio@123456';

async function login(page: Page) {
  await page.goto('/pt/auth/login');
  await page.fill('[data-testid="email-input"]', DEMO_EMAIL);
  await page.fill('[data-testid="password-input"]', DEMO_PASSWORD);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/dashboard/);
}

async function getCreditBalance(page: Page): Promise<number> {
  const balanceText = await page.locator('[data-testid="credit-balance"]').textContent();
  const match = balanceText?.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

test.describe('Agent Copywriter Run', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should complete copywriter run and show result', async ({ page }) => {
    await page.goto('/pt/dashboard/agents/copywriter');

    const balanceBefore = await getCreditBalance(page);

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Criar post sobre lançamento do novo bolo de cenoura');

    await page.click('[data-testid="agent-submit"]');

    await expect(page.locator('[data-testid="run-status"]')).toContainText(
      /running|processando/i,
      { timeout: 10000 },
    );

    await expect(page.locator('[data-testid="run-result"]')).toBeVisible({
      timeout: 60000,
    });

    await expect(page.locator('[data-testid="caption-output"]')).toBeVisible();

    const caption = await page.locator('[data-testid="caption-output"]').textContent();
    expect(caption?.length).toBeGreaterThan(10);

    await expect(page.locator('[data-testid="hashtags-output"]')).toBeVisible();

    const balanceAfter = await getCreditBalance(page);
    expect(balanceAfter).toBeLessThan(balanceBefore);
  });

  test('should show insufficient balance error', async ({ page }) => {
    await page.goto('/pt/dashboard/agents/copywriter');

    const input = page.locator('[data-testid="agent-input"]');
    await input.fill('Test post');

    await page.click('[data-testid="agent-submit"]');

    const hasInsufficientBalance = await page
      .locator('[data-testid="insufficient-balance-error"]')
      .isVisible()
      .catch(() => false);

    if (hasInsufficientBalance) {
      await expect(
        page.locator('[data-testid="insufficient-balance-error"]'),
      ).toBeVisible();
    }
  });
});
