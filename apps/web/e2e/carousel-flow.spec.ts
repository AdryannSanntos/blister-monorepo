import { expect, test } from "./fixtures/auth";

test.describe("Carousel Agent — smoke tests", () => {
  test("overview page renders carousel agent", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await expect(page.getByTestId("carousel-overview-page")).toBeVisible();
  });

  test("clicking Novo Carrossel opens run modal", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await expect(page.getByTestId("carousel-overview-page")).toBeVisible();
    await page.getByTestId("carousel-new-run-button").click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
  });

  test("run modal shows theme first; template inside generation options", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await page.getByTestId("carousel-new-run-button").click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
    await expect(page.getByTestId("carousel-theme-input")).toBeVisible();
    await expect(page.getByTestId("carousel-options-trigger")).toBeVisible();

    await page.getByTestId("carousel-options-trigger").click();
    await expect(page.getByTestId("carousel-template-select")).toBeVisible();
  });

  test("submitting modal shows status modal", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await page.getByTestId("carousel-new-run-button").click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
    await page.getByTestId("carousel-theme-input").fill("5 hábitos matinais");
    await page.getByTestId("carousel-start-run-button").click();
    await expect(page.getByTestId("carousel-status-modal")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("run detail page shows ideas phase on load", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(
      "/dashboard/agents/carousel/runs/run_carousel_preview",
    );
    await expect(page.getByTestId("carousel-run-detail-page")).toBeVisible();
    await expect(page.getByTestId("carousel-ideas-step")).toBeVisible();
    await expect(
      page.locator('[data-testid^="carousel-idea-card-"]'),
    ).toHaveCount(5);
  });

  test("can navigate back to ideas after selecting one", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/runs/run_carousel_preview");
    await page.getByTestId("carousel-idea-card-idea_1").click();
    await expect(page.getByTestId("carousel-content-step")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("carousel-run-step-ideas").click();
    await expect(page.getByTestId("carousel-ideas-step")).toBeVisible();
    await expect(page.getByTestId("carousel-idea-card-idea_1")).toBeVisible();
  });

  test("settings page renders for carousel agent", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/settings");
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  });
});
