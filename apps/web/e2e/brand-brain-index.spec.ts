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

test.describe('Brand Brain Index', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should update brand voice and show indexing status', async ({ page }) => {
    await page.goto('/pt/dashboard/brand');

    await expect(page.locator('[data-testid="brand-form"]')).toBeVisible();

    const brandVoiceField = page.locator('[data-testid="brand-voice-input"]');
    await brandVoiceField.clear();
    await brandVoiceField.fill(
      'Tom acolhedor e caseiro, como uma conversa entre amigas. Usamos emojis com moderação.',
    );

    await page.click('[data-testid="save-brand-button"]');

    await expect(page.locator('[data-testid="save-success"]')).toBeVisible({
      timeout: 10000,
    });

    const indexingStatus = page.locator('[data-testid="indexing-status"]');
    if (await indexingStatus.isVisible()) {
      await expect(indexingStatus).toContainText(/indexando|indexed/i, {
        timeout: 30000,
      });
    }
  });

  test('should show brand profile fields', async ({ page }) => {
    await page.goto('/pt/dashboard/brand');

    await expect(page.locator('[data-testid="brand-form"]')).toBeVisible();

    await expect(page.locator('[data-testid="brand-voice-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="niche-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="target-audience-input"]')).toBeVisible();
  });
});
