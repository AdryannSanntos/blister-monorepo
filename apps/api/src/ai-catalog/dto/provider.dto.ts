import { z } from 'zod';

const kebabCaseSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must use lowercase kebab-case');

const providerStatusSchema = z.enum(['draft', 'active', 'disabled']);
const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const createProviderSchema = z.strictObject({
  slug: kebabCaseSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  status: providerStatusSchema.default('draft'),
  iconMetadata: metadataSchema,
  capabilityMetadata: metadataSchema,
  pricingMetadata: metadataSchema,
  limitsMetadata: metadataSchema,
  schemaMetadata: metadataSchema,
});

export const updateProviderSchema = z.strictObject({
  slug: kebabCaseSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  status: providerStatusSchema.optional(),
  iconMetadata: metadataSchema.optional(),
  capabilityMetadata: metadataSchema.optional(),
  pricingMetadata: metadataSchema.optional(),
  limitsMetadata: metadataSchema.optional(),
  schemaMetadata: metadataSchema.optional(),
});

export type CreateProviderDto = z.infer<typeof createProviderSchema>;
export type UpdateProviderDto = z.infer<typeof updateProviderSchema>;
export { kebabCaseSchema, metadataSchema, providerStatusSchema };
