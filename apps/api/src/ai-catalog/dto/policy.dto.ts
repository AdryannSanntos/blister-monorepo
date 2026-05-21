import { z } from 'zod';
import { metadataSchema } from './provider.dto';

export const upsertPolicySchema = z.strictObject({
  organizationId: z.string().min(1),
  providerId: z.string().min(1),
  allowedModelIds: z.array(z.string().min(1)).default([]),
  metadata: metadataSchema,
});

export const listPoliciesSchema = z.strictObject({
  organizationId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
});

export type UpsertPolicyDto = z.infer<typeof upsertPolicySchema>;
export type ListPoliciesDto = z.infer<typeof listPoliciesSchema>;
