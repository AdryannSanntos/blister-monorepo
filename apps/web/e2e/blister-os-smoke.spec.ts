import { expect, test } from "./fixtures/auth";

// Cuts é o único agente operacional do produto. Rotas de outros agentes
// (video-editor, research, etc.) redirecionam para /dashboard.
const ROUTES = [
  { path: "/dashboard", testId: "dashboard-home-page" },
  { path: "/dashboard/marketplace", testId: "marketplace-page" },
  { path: "/dashboard/library", testId: "library-page" },
  { path: "/dashboard/projects", testId: "projects-page" },
  { path: "/dashboard/files", testId: "files-page" },
  { path: "/dashboard/settings", testId: "settings-page" },
  { path: "/dashboard/history", testId: "history-page" },
  {
    path: "/dashboard/agents/cuts/overview",
    testId: "agent-overview-page",
  },
  {
    path: "/dashboard/agents/cuts/new",
    testId: "agent-overview-page",
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
    await expect(
      page.getByRole("heading", { name: "Permissões" }),
    ).toBeVisible();
  });

  test("marketplace is empty in the cuts-only product", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/marketplace");
    await expect(page.getByTestId("marketplace-page")).toBeVisible();
    await expect(page.getByText("Nenhum item encontrado")).toBeVisible();
  });

  test("a non-cuts agent route redirects to the dashboard home", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/video-editor/overview");
    await expect(page.getByTestId("dashboard-home-page")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
