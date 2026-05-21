import { z } from 'zod';
import { metadataSchema } from './provider.dto';

export const createCredentialSchema = z.strictObject({
  providerId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  label: z.string().trim().min(2).max(120),
  value: z.string().min(1),
  schemaMetadata: metadataSchema,
});

export const updateCredentialSchema = z.strictObject({
  providerId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  label: z.string().trim().min(2).max(120).optional(),
  value: z.string().min(1).optional(),
  schemaMetadata: metadataSchema.optional(),
});

export type CreateCredentialDto = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialDto = z.infer<typeof updateCredentialSchema>;
