import { z } from 'zod';

export const createColorGroupSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateColorGroupDto = z.infer<typeof createColorGroupSchema>;
