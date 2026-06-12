# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: blister-os-smoke.spec.ts >> Blister OS smoke routes >> /dashboard/projects renders
- Location: e2e/blister-os-smoke.spec.ts:18:9

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - paragraph [ref=e9]:
      - text: © 2026 Blister. All rights reserved.
      - link "Privacy Policy" [ref=e10] [cursor=pointer]:
        - /url: /en/privacy
      - text: ·
      - link "Terms of Use" [ref=e11] [cursor=pointer]:
        - /url: /en/terms
    - generic [ref=e13]:
      - img "Blister" [ref=e15]:
        - img [ref=e16]
      - generic [ref=e26]:
        - heading "Welcome back" [level=1] [ref=e27]
        - paragraph [ref=e28]: Sign in to your account to continue
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: Email
          - textbox "Email" [ref=e32]:
            - /placeholder: you@email.com
            - text: negocio@blister.com.br
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Password
            - link "Forgot password?" [ref=e36] [cursor=pointer]:
              - /url: /en/auth/forgot-password
          - generic [ref=e37]:
            - textbox "Password" [ref=e38]:
              - /placeholder: Your password
              - text: Negocio@123456
            - button "Mostrar senha" [ref=e39]:
              - img [ref=e40]
        - generic [ref=e43]:
          - checkbox "Remember email on this device" [ref=e44]
          - checkbox
          - generic [ref=e45] [cursor=pointer]: Remember email on this device
        - button "Sign in" [ref=e46]
      - generic [ref=e49]: or
      - generic [ref=e51]:
        - button "Continue with Google" [ref=e52]:
          - img
          - text: Continue with Google
        - button "Continue with Apple" [disabled]:
          - img
          - text: Continue with Apple
      - paragraph [ref=e53]:
        - text: Don't have an account?
        - link "Create account" [ref=e54] [cursor=pointer]:
          - /url: /en/auth/signup
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e60] [cursor=pointer]:
    - img [ref=e61]
  - alert [ref=e64]
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
  8  |   const emailInput = page.getByRole("textbox", { name: /email/i });
  9  |   const passwordInput = page.locator('input[type="password"]');
  10 |   await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  11 |   await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
  12 |   await emailInput.fill(DEMO_EMAIL);
  13 |   await passwordInput.fill(DEMO_PASSWORD);
  14 |   await page.getByRole("button", { name: /entrar|sign in/i }).click();
> 15 |   await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  16 | }
  17 | 
  18 | export const test = base.extend<{ authenticatedPage: Page }>({
  19 |   authenticatedPage: async ({ page }, use) => {
  20 |     await login(page);
  21 |     await use(page);
  22 |   },
  23 | });
  24 | 
  25 | export { expect } from "@playwright/test";
  26 | 
```