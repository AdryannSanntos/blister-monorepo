# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agents-surface.spec.ts >> Agent surface chat layout >> copywriter shows organized chat shell
- Location: e2e/agents-surface.spec.ts:32:9

# Error details

```
Test timeout of 30000ms exceeded while setting up "authenticatedPage".
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: 'Senha' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - paragraph [ref=e9]:
      - text: © 2026 Blister. All rights reserved.
      - link "Privacy Policy" [ref=e10] [cursor=pointer]:
        - /url: /en/privacy
      - text: ·
      - link "Terms of Use" [ref=e11] [cursor=pointer]:
        - /url: /en/terms
    - generic [ref=e13]:
      - img "Blister" [ref=e15]
      - generic [ref=e25]:
        - heading "Welcome back" [level=1] [ref=e26]
        - paragraph [ref=e27]: Sign in to your account to continue
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: Email
          - textbox "Email" [active] [ref=e31]:
            - /placeholder: you@email.com
            - text: negocio@blister.com.br
        - generic [ref=e32]:
          - generic [ref=e33]:
            - generic [ref=e34]: Password
            - link "Forgot password?" [ref=e35] [cursor=pointer]:
              - /url: /en/auth/forgot-password
          - generic [ref=e36]:
            - textbox "Password" [ref=e37]:
              - /placeholder: Your password
            - button "Mostrar senha" [ref=e38]:
              - img [ref=e39]
        - generic [ref=e42]:
          - checkbox "Remember email on this device" [ref=e43]
          - checkbox
          - generic [ref=e44] [cursor=pointer]: Remember email on this device
        - button "Sign in" [ref=e45]
      - generic [ref=e48]: or
      - generic [ref=e50]:
        - button "Continue with Google" [ref=e51]:
          - img
          - text: Continue with Google
        - button "Continue with Apple" [disabled]:
          - img
          - text: Continue with Apple
      - paragraph [ref=e52]:
        - text: Don't have an account?
        - link "Create account" [ref=e53] [cursor=pointer]:
          - /url: /en/auth/signup
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e59] [cursor=pointer]:
    - img [ref=e60]
  - alert [ref=e63]
```

# Test source

```ts
  1  | import { test as base, type Page } from "@playwright/test";
  2  | 
  3  | const DEMO_EMAIL = process.env.E2E_EMAIL ?? "negocio@blister.com.br";
  4  | const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "Negocio@123456";
  5  | 
  6  | async function login(page: Page) {
  7  |   await page.goto("/auth/login");
  8  |   await page.getByRole("textbox", { name: "Email" }).fill(DEMO_EMAIL);
> 9  |   await page.getByRole("textbox", { name: "Senha" }).fill(DEMO_PASSWORD);
     |                                                      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Entrar" }).click();
  11 |   await page.waitForURL(/\/dashboard/);
  12 | }
  13 | 
  14 | export const test = base.extend<{ authenticatedPage: Page }>({
  15 |   authenticatedPage: async ({ page }, use) => {
  16 |     await login(page);
  17 |     await use(page);
  18 |   },
  19 | });
  20 | 
  21 | export { expect } from "@playwright/test";
  22 | 
```