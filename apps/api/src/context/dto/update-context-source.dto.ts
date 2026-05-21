import { z } from 'zod';

export const updateContextSourceSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
    normalizedContent: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    category: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateContextSourceDto = z.infer<typeof updateContextSourceSchema>;
