"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchemaMatchers = exports.toMatchSchema = exports.assertMatchesSchema = void 0;
const formatIssues = (error) => error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
/** Standalone assertion: throws a formatted error if value doesn't match. */
const assertMatchesSchema = (value, schema) => {
    const result = schema.safeParse(value);
    if (result.success)
        return;
    throw new Error(`Schema validation failed: ${formatIssues(result.error)}`);
};
exports.assertMatchesSchema = assertMatchesSchema;
/** Jest/Vitest matcher implementation for `expect(value).toMatchSchema(schema)`. */
const toMatchSchema = (received, schema) => {
    const result = schema.safeParse(received);
    return {
        pass: result.success,
        message: () => result.success
            ? 'Expected value not to match schema, but it did'
            : `Expected value to match schema: ${formatIssues(result.error)}`,
    };
};
exports.toMatchSchema = toMatchSchema;
/**
 * Registers the `toMatchSchema` matcher on a jest/vitest-style `expect`. Call
 * once in a test setup file: `registerSchemaMatchers(expect)`.
 */
const registerSchemaMatchers = (expectFn) => {
    expectFn.extend({ toMatchSchema: exports.toMatchSchema });
};
exports.registerSchemaMatchers = registerSchemaMatchers;
