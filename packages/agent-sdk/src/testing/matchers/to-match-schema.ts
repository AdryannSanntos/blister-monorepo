import type { z } from 'zod';

const formatIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

/** Standalone assertion: throws a formatted error if value doesn't match. */
export const assertMatchesSchema = (value: unknown, schema: z.ZodType): void => {
  const result = schema.safeParse(value);
  if (result.success) return;
  throw new Error(`Schema validation failed: ${formatIssues(result.error)}`);
};

/** Jest/Vitest matcher implementation for `expect(value).toMatchSchema(schema)`. */
export const toMatchSchema = (received: unknown, schema: z.ZodType) => {
  const result = schema.safeParse(received);
  return {
    pass: result.success,
    message: () =>
      result.success
        ? 'Expected value not to match schema, but it did'
        : `Expected value to match schema: ${formatIssues(result.error)}`,
  };
};

interface ExpectExtendable {
  extend(matchers: Record<string, unknown>): void;
}

/**
 * Registers the `toMatchSchema` matcher on a jest/vitest-style `expect`. Call
 * once in a test setup file: `registerSchemaMatchers(expect)`.
 */
export const registerSchemaMatchers = (expectFn: ExpectExtendable): void => {
  expectFn.extend({ toMatchSchema });
};
