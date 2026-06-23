import { expect, test } from "./fixtures/auth";

test.describe("DataTable integrated panel header", () => {
  test("toolbar controls render inside the bordered table panel", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/workspace/team");
    await expect(
      page.getByRole("heading", { name: /team|equipe/i }),
    ).toBeVisible();

    const panel = page.getByTestId("data-table-panel").first();
    await expect(panel).toBeVisible();

    const panelHeader = panel.getByTestId("data-table-panel-header");
    await expect(panelHeader).toBeVisible();

    await expect(
      panelHeader.getByRole("button", { name: /filtrar tabela|filter table/i }),
    ).toBeVisible();
    await expect(
      panelHeader.getByRole("button", {
        name: /configurar colunas|configure columns/i,
      }),
    ).toBeVisible();

    await expect(panel.locator('[data-slot="table-header"]')).toBeVisible();

    const panelBox = await panel.boundingBox();
    const headerBox = await panelHeader.boundingBox();
    const tableHeaderBox = await panel
      .locator('[data-slot="table-header"]')
      .boundingBox();

    expect(panelBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(tableHeaderBox).not.toBeNull();

    if (panelBox && headerBox && tableHeaderBox) {
      expect(headerBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(tableHeaderBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - 1,
      );
    }
  });

  test("title and surface icon render inside the panel header", async ({
    page,
  }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@blister.com.br";
    const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Admin@123456";

    await page.goto("/auth/login");
    await page.getByRole("textbox", { name: /email/i }).fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/(dashboard|admin|workspaces)/, {
      timeout: 20_000,
    });

    await page.goto("/admin?tab=ai-catalog");
    await expect(page.getByRole("tab", { name: /ai catalog/i })).toHaveAttribute(
      "data-state",
      "active",
    );

    const providersHeading = page
      .getByTestId("data-table-heading")
      .filter({ hasText: /providers/i });
    await expect(providersHeading).toBeVisible();
    await expect(
      providersHeading.getByTestId("data-table-surface-icon"),
    ).toBeVisible();

    const modelsHeading = page
      .getByTestId("data-table-heading")
      .filter({ hasText: /models|modelos/i });
    await modelsHeading.scrollIntoViewIfNeeded();
    await expect(modelsHeading).toBeVisible();

    const panel = modelsHeading.locator(
      'xpath=ancestor::*[@data-testid="data-table-panel"]',
    );
    await expect(panel).toBeVisible();
    await expect(
      modelsHeading.getByTestId("data-table-surface-icon"),
    ).toBeVisible();
  });
});
