import { expect, test } from "./fixtures/auth";

test.describe("Cuts flow", () => {
  test("overview opens run modal on source step", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/overview");
    await expect(page.getByTestId("agent-overview-page")).toBeVisible();
    await page.getByTestId("cuts-new-run-button").click();
    await expect(page.getByTestId("cuts-run-modal")).toBeVisible();
    await expect(page.getByTestId("cuts-source-step")).toBeVisible();
  });

  test("legacy /results redirects to overview", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/results");
    await expect(page.getByTestId("agent-overview-page")).toBeVisible();
    await expect(page.getByTestId("cuts-results-grid")).toBeVisible();
  });

  test("settings page renders for cuts agent", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/settings");
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  });

  test("legacy /new route redirects to overview and opens run modal", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/new");
    await expect(page.getByTestId("agent-overview-page")).toBeVisible();
    await expect(page.getByTestId("cuts-run-modal")).toBeVisible();
    await expect(page.getByTestId("cuts-source-step")).toBeVisible();
  });

  test("run card preview navigates to run detail page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/overview");
    await expect(page.getByTestId("cuts-results-grid")).toBeVisible();

    const previewButton = page.locator('[data-testid^="cuts-run-card-preview-"]').first();
    if ((await previewButton.count()) === 0) test.skip();

    await previewButton.click();
    await expect(page.getByTestId("cuts-run-detail-page")).toBeVisible();
  });

  test("run card preview and title show pointer cursor", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/cuts/overview");
    await expect(page.getByTestId("cuts-results-grid")).toBeVisible();

    const previewButton = page.locator('[data-testid^="cuts-run-card-preview-"]').first();
    if ((await previewButton.count()) === 0) test.skip();

    await expect(previewButton).toHaveCSS("cursor", "pointer");
  });

  test("full run flow opens status modal then navigates to run page", async ({
    authenticatedPage: page,
  }) => {
    test.setTimeout(90_000);

    await page.goto("/dashboard/agents/cuts/overview");
    await page.getByTestId("cuts-new-run-button").click();
    await expect(page.getByTestId("cuts-source-step")).toBeVisible();

    await page
      .getByRole("button", { name: /Escolher dos Arquivos|Choose from Files/i })
      .click();
    await expect(page.getByTestId("cuts-file-picker-modal")).toBeVisible();

    await page.getByRole("button", { name: /^(Cortes|Uploads)$/i }).click();

    const firstFile = page.locator('[data-testid^="file-option-"]').first();
    await expect(firstFile).toBeVisible({ timeout: 15_000 });
    await firstFile.click();

    await page.getByRole("button", { name: /Usar arquivo|Use file/i }).click();
    await page.getByTestId("cuts-start-run-button").click();

    await expect(page.getByTestId("cuts-status-modal")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("cuts-status-modal")).toHaveAttribute(
      "data-variant",
      "success",
    );
    await expect(page.getByTestId("cuts-run-modal")).not.toBeVisible();

    await page.getByTestId("cuts-status-view-execution").click();
    await expect(page.getByTestId("cuts-run-detail-page")).toBeVisible();

    await expect(
      page.getByTestId("cuts-run-progress").or(page.getByTestId("cuts-gallery")),
    ).toBeVisible({ timeout: 45_000 });
  });
});
