import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only `.spec.ts` run under vitest. The migrated agent-framework `.test.ts`
    // files use `node:test` (run via the legacy package) and are not vitest-compatible.
    include: ['src/**/*.spec.ts'],
  },
});
