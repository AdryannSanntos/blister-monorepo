import { z } from 'zod';

export const organizationSyncPayloadSchema = z.object({
  organizationId: z.string().min(1),
});

export type OrganizationSyncPayload = z.infer<typeof organizationSyncPayloadSchema>;
