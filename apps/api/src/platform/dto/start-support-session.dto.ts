import { z } from 'zod';

export const startSupportSessionSchema = z.strictObject({
  organizationId: z.string().min(1, 'organizationId is required'),
  reason: z.string().min(8, 'reason must be at least 8 characters'),
});

export type StartSupportSessionDto = z.infer<typeof startSupportSessionSchema>;
