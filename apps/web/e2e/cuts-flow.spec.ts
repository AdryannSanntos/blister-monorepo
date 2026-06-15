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

  test("results page renders", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard/agents/cuts/results");
    await expect(page.getByTestId("cuts-results-page")).toBeVisible();
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

  // Regression guard: the row action menu used `modal={false}` + onSelect
  // preventDefault, which pinned the renderer in a focus loop and froze the tab
  // when opening the results modal. Opening must stay responsive.
  test(
    "viewing a completed run from the results table opens the modal without freezing",
    async ({ authenticatedPage: page }) => {
      await page.goto("/dashboard/agents/cuts/results");
      await expect(page.getByTestId("cuts-results-page")).toBeVisible();

      const actionButton = page
        .getByRole("button", { name: /Ações para|Actions for/i })
        .first();

      // Nothing to view in this workspace — skip rather than assert falsely.
      if ((await actionButton.count()) === 0) test.skip();

      await actionButton.click();
      await page.getByRole("menuitem", { name: /Ver cortes|View cuts/i }).click();

      // The results modal must appear and the page must stay responsive.
      const modal = page.getByTestId("cuts-run-modal");
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await expect(modal).toHaveAttribute("data-phase", "results");
      // Responsiveness probe: closing must work (a frozen tab can't honor this).
      await page.getByRole("button", { name: /Fechar|Close/i }).first().click();
      await expect(modal).toBeHidden({ timeout: 5_000 });
    },
  );

  test("full run flow reveals generated cuts inside the modal", async ({
    authenticatedPage: page,
  }) => {
    test.setTimeout(60_000);

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

    await expect(page.getByTestId("cuts-processing-step")).toBeVisible();
    await expect(page.getByTestId("cuts-results-step")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('[data-testid^="cut-review-item-"]').first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
