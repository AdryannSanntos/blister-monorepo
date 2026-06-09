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

async function runCopywriterAgent(page: Page) {
  await page.goto('/pt/dashboard/agents/copywriter');

  const input = page.locator('[data-testid="agent-input"]');
  await input.fill('Post para teste de aprovação');

  await page.click('[data-testid="agent-submit"]');

  await expect(page.locator('[data-testid="run-result"]')).toBeVisible({
    timeout: 60000,
  });
}

test.describe('Agent Approve Learning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should approve run and show success', async ({ page }) => {
    await runCopywriterAgent(page);

    await page.click('[data-testid="approve-button"]');

    await expect(page.locator('[data-testid="approval-success"]')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="review-status"]')).toContainText(
      /aprovado|approved/i,
    );

    const historyTab = page.locator('[data-testid="history-tab"]');
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await expect(page.locator('[data-testid="run-history"]')).toContainText(
        /aprovado|approved/i,
      );
    }
  });

  test('should reject run with reason', async ({ page }) => {
    await runCopywriterAgent(page);

    await page.click('[data-testid="reject-button"]');

    const rejectModal = page.locator('[data-testid="reject-modal"]');
    await expect(rejectModal).toBeVisible();

    await page.fill(
      '[data-testid="reject-reason-input"]',
      'Tom muito formal para nossa marca',
    );

    await page.click('[data-testid="confirm-reject-button"]');

    await expect(page.locator('[data-testid="review-status"]')).toContainText(
      /rejeitado|rejected/i,
      { timeout: 10000 },
    );
  });

  test('should edit output before approving', async ({ page }) => {
    await runCopywriterAgent(page);

    const editButton = page.locator('[data-testid="edit-output-button"]');
    if (!(await editButton.isVisible())) {
      test.skip();
      return;
    }

    await editButton.click();

    const captionTextarea = page.locator('[data-testid="caption-edit-textarea"]');
    await captionTextarea.fill('Legenda editada pelo usuário');

    await page.click('[data-testid="save-edit-button"]');

    await page.click('[data-testid="approve-button"]');

    await expect(page.locator('[data-testid="approval-success"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
