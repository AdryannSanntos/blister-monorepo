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

  test("run modal has theme textarea and template select", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await page.getByTestId("carousel-new-run-button").click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("submitting modal shows status modal", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/overview");
    await page.getByTestId("carousel-new-run-button").click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
    await page.getByRole("textbox").fill("5 hábitos matinais");
    await page.getByRole("button", { name: /gerar carrossel/i }).click();
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

  test("selecting idea reveals content phase", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(
      "/dashboard/agents/carousel/runs/run_carousel_preview",
    );
    await expect(page.getByTestId("carousel-ideas-step")).toBeVisible();
    await page.getByTestId("carousel-idea-card-idea_1").click();
    await expect(page.getByTestId("carousel-content-step")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("settings page renders for carousel agent", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/carousel/settings");
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  });
});
