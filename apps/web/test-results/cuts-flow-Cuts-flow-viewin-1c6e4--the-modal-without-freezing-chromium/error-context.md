# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cuts-flow.spec.ts >> Cuts flow >> viewing a completed run from the results table opens the modal without freezing
- Location: e2e/cuts-flow.spec.ts:38:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('cuts-results-page')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('cuts-results-page')

```

```yaml
- img
- heading "This page couldn’t load" [level=1]
- paragraph: Reload to try again, or go back.
- button "Reload"
- button "Back"
```

# Test source

```ts
  1  | import { expect, test } from "./fixtures/auth";
  2  | 
  3  | test.describe("Cuts flow", () => {
  4  |   test("overview opens run modal on source step", async ({
  5  |     authenticatedPage: page,
  6  |   }) => {
  7  |     await page.goto("/dashboard/agents/cuts/overview");
  8  |     await expect(page.getByTestId("agent-overview-page")).toBeVisible();
  9  |     await page.getByTestId("cuts-new-run-button").click();
  10 |     await expect(page.getByTestId("cuts-run-modal")).toBeVisible();
  11 |     await expect(page.getByTestId("cuts-source-step")).toBeVisible();
  12 |   });
  13 | 
  14 |   test("results page renders", async ({ authenticatedPage: page }) => {
  15 |     await page.goto("/dashboard/agents/cuts/results");
  16 |     await expect(page.getByTestId("cuts-results-page")).toBeVisible();
  17 |   });
  18 | 
  19 |   test("settings page renders for cuts agent", async ({
  20 |     authenticatedPage: page,
  21 |   }) => {
  22 |     await page.goto("/dashboard/agents/cuts/settings");
  23 |     await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  24 |   });
  25 | 
  26 |   test("legacy /new route redirects to overview and opens run modal", async ({
  27 |     authenticatedPage: page,
  28 |   }) => {
  29 |     await page.goto("/dashboard/agents/cuts/new");
  30 |     await expect(page.getByTestId("agent-overview-page")).toBeVisible();
  31 |     await expect(page.getByTestId("cuts-run-modal")).toBeVisible();
  32 |     await expect(page.getByTestId("cuts-source-step")).toBeVisible();
  33 |   });
  34 | 
  35 |   // Regression guard: the row action menu used `modal={false}` + onSelect
  36 |   // preventDefault, which pinned the renderer in a focus loop and froze the tab
  37 |   // when opening the results modal. Opening must stay responsive.
  38 |   test(
  39 |     "viewing a completed run from the results table opens the modal without freezing",
  40 |     async ({ authenticatedPage: page }) => {
  41 |       await page.goto("/dashboard/agents/cuts/results");
> 42 |       await expect(page.getByTestId("cuts-results-page")).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  43 | 
  44 |       const actionButton = page
  45 |         .getByRole("button", { name: /Ações para|Actions for/i })
  46 |         .first();
  47 | 
  48 |       // Nothing to view in this workspace — skip rather than assert falsely.
  49 |       if ((await actionButton.count()) === 0) test.skip();
  50 | 
  51 |       await actionButton.click();
  52 |       await page.getByRole("menuitem", { name: /Ver cortes|View cuts/i }).click();
  53 | 
  54 |       // The results modal must appear and the page must stay responsive.
  55 |       const modal = page.getByTestId("cuts-run-modal");
  56 |       await expect(modal).toBeVisible({ timeout: 5_000 });
  57 |       await expect(modal).toHaveAttribute("data-phase", "results");
  58 |       // Responsiveness probe: closing must work (a frozen tab can't honor this).
  59 |       await page.getByRole("button", { name: /Fechar|Close/i }).first().click();
  60 |       await expect(modal).toBeHidden({ timeout: 5_000 });
  61 |     },
  62 |   );
  63 | 
  64 |   test("full run flow reveals generated cuts inside the modal", async ({
  65 |     authenticatedPage: page,
  66 |   }) => {
  67 |     test.setTimeout(60_000);
  68 | 
  69 |     await page.goto("/dashboard/agents/cuts/overview");
  70 |     await page.getByTestId("cuts-new-run-button").click();
  71 |     await expect(page.getByTestId("cuts-source-step")).toBeVisible();
  72 | 
  73 |     await page
  74 |       .getByRole("button", { name: /Escolher dos Arquivos|Choose from Files/i })
  75 |       .click();
  76 |     await expect(page.getByTestId("cuts-file-picker-modal")).toBeVisible();
  77 | 
  78 |     await page.getByRole("button", { name: /^(Cortes|Uploads)$/i }).click();
  79 | 
  80 |     const firstFile = page.locator('[data-testid^="file-option-"]').first();
  81 |     await expect(firstFile).toBeVisible({ timeout: 15_000 });
  82 |     await firstFile.click();
  83 | 
  84 |     await page.getByRole("button", { name: /Usar arquivo|Use file/i }).click();
  85 |     await page.getByTestId("cuts-start-run-button").click();
  86 | 
  87 |     await expect(page.getByTestId("cuts-processing-step")).toBeVisible();
  88 |     await expect(page.getByTestId("cuts-results-step")).toBeVisible({
  89 |       timeout: 30_000,
  90 |     });
  91 |     await expect(
  92 |       page.locator('[data-testid^="cut-review-item-"]').first(),
  93 |     ).toBeVisible({ timeout: 15_000 });
  94 |   });
  95 | });
  96 | 
```