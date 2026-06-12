import { expect, test } from "./fixtures/auth";

const ROUTES = [
  { path: "/dashboard", testId: "dashboard-home-page" },
  { path: "/dashboard/marketplace", testId: "marketplace-page" },
  { path: "/dashboard/library", testId: "library-page" },
  { path: "/dashboard/projects", testId: "projects-page" },
  { path: "/dashboard/files", testId: "files-page" },
  { path: "/dashboard/settings", testId: "settings-page" },
  { path: "/dashboard/history", testId: "history-page" },
  {
    path: "/dashboard/agents/video-editor/overview",
    testId: "agent-overview-page",
  },
  {
    path: "/dashboard/agents/video-editor/history",
    testId: "agent-history-page",
  },
  {
    path: "/dashboard/agents/video-editor/new",
    testId: "video-editor-page",
  },
  {
    path: "/dashboard/agents/cuts/overview",
    testId: "agent-overview-page",
  },
  {
    path: "/dashboard/agents/cuts/new",
    testId: "agent-overview-page",
  },
  {
    path: "/dashboard/agents/research/overview",
    testId: "agent-overview-page",
  },
  {
    path: "/dashboard/agents/research/new",
    testId: "research-page",
  },
] as const;

test.describe("Blister OS smoke routes", () => {
  for (const route of ROUTES) {
    test(`${route.path} renders`, async ({ authenticatedPage: page }) => {
      await page.goto(route.path);
      await expect(page.getByTestId(route.testId)).toBeVisible();
    });
  }

  test("credits, team and permissions pages render", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/credits");
    await expect(page.getByRole("heading", { name: "Créditos" })).toBeVisible();

    await page.goto("/dashboard/workspace/team");
    await expect(page.getByRole("heading", { name: "Equipe" })).toBeVisible();

    await page.goto("/dashboard/workspace/permissions");
    await expect(page.getByRole("heading", { name: "Permissões" })).toBeVisible();
  });

  test("marketplace redeem flow updates library", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/marketplace");
    await page.getByRole("link", { name: /Documental/i }).first().click();
    await page.getByRole("button", { name: /Resgatar grátis/i }).click();
    await page.goto("/dashboard/library");
    await expect(page.getByText("Documental")).toBeVisible();
  });
});
