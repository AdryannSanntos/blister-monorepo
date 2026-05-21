import { z } from 'zod';

export const createColorTokenSchema = z.object({
  colorGroupId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  value: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a valid hex value'),
  displayFormat: z.string().trim().min(1).default('hex'),
  semanticRole: z.string().trim().min(1).default('custom'),
  usageNote: z.string().trim().optional().nullable(),
  restrictionNote: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateColorTokenDto = z.infer<typeof createColorTokenSchema>;
