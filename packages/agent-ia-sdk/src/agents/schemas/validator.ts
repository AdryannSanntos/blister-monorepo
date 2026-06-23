import type { z } from 'zod';

export interface Validator<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): z.ZodSafeParseResult<T>;
  assert(input: unknown): asserts input is T;
}

/** Reusable validator bundle around a Zod schema. */
export const createValidator = <T extends z.ZodType>(schema: T): Validator<z.infer<T>> => {
  return {
    parse: (input) => schema.parse(input) as z.infer<T>,
    safeParse: (input) => schema.safeParse(input) as z.ZodSafeParseResult<z.infer<T>>,
    assert: (input): asserts input is z.infer<T> => {
      schema.parse(input);
    },
  };
};
