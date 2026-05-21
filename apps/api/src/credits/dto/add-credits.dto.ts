import { z } from 'zod';

export const addCreditsSchema = z.strictObject({
  amount: z.number().int().positive(),
  reason: z.string().trim().max(240).optional(),
});

export type AddCreditsDto = z.infer<typeof addCreditsSchema>;
