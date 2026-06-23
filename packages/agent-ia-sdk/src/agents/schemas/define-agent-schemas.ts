import type { z } from 'zod';
import { zodToJsonSchema } from './zod-to-json-schema';

type SchemaMap = Record<string, z.ZodType>;

export const defineAgentSchemas = <T extends SchemaMap>(schemas: T) => {
  const json = Object.fromEntries(
    Object.entries(schemas).map(([key, schema]) => [key, zodToJsonSchema(schema)]),
  ) as { [K in keyof T]: Record<string, unknown> };

  return {
    zod: schemas,
    json,
    infer: {} as { [K in keyof T]: z.infer<T[K]> },
  };
};
