import { z } from 'zod';

export const startSupportSessionSchema = z.strictObject({
  reason: z.string().min(8, 'reason must be at least 8 characters'),
});

export type StartSupportSessionDto = z.infer<typeof startSupportSessionSchema>;
