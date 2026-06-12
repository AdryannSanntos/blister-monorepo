import { expect, test } from "./fixtures/auth";

test.describe("Cuts flow", () => {
  test("overview opens source modal", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/agents/cuts/overview");
    await expect(page.getByTestId("agent-overview-page")).toBeVisible();
    await page.getByTestId("cuts-new-run-button").click();
    await expect(page.getByTestId("cuts-source-modal")).toBeVisible();
  });

  test("results page renders", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/agents/cuts/results");
    await expect(page.getByTestId("cuts-results-page")).toBeVisible();
  });

  test("settings page renders for cuts agent", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/agents/cuts/settings");
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  });

  test("legacy /new route redirects to overview and opens source modal", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/new");
    await expect(page.getByTestId("agent-overview-page")).toBeVisible();
    await expect(page.getByTestId("cuts-source-modal")).toBeVisible();
  });

  test("full run flow opens status modal with success after generate", async ({
    authenticatedPage: page,
  }) => {
    test.setTimeout(60_000);

    await page.goto("/dashboard/agents/cuts/overview");
    await page.getByTestId("cuts-new-run-button").click();
    await expect(page.getByTestId("cuts-source-modal")).toBeVisible();

    await page.getByRole("button", { name: /Escolher dos Arquivos|Choose from Files/i }).click();
    await expect(page.getByTestId("cuts-file-picker-modal")).toBeVisible();

    await page.getByRole("button", { name: /^Uploads$/i }).click();

    const firstFile = page.locator('[data-testid^="file-option-"]').first();
    await expect(firstFile).toBeVisible({ timeout: 15_000 });
    await firstFile.click();

    await page.getByRole("button", { name: /Usar arquivo|Use file/i }).click();
    await page.getByTestId("cuts-start-run-button").click();

    await expect(page.getByTestId("cuts-source-loading")).toBeVisible();
    await expect(page.getByTestId("cuts-status-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("cuts-source-modal")).not.toBeVisible();
    await expect(page.getByTestId("cuts-go-to-overview")).toBeVisible({ timeout: 15_000 });
  });
});
