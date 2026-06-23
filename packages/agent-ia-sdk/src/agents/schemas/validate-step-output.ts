import type { z } from 'zod';

export const validateStepOutput = <T extends z.ZodType>(
  schema: T,
  value: unknown,
): { success: true; data: z.infer<T> } | { success: false } => {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { success: false };
  }

  return { success: true, data: result.data };
};
