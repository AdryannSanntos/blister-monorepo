import { z } from 'zod';
import { kebabCaseSchema, metadataSchema } from './provider.dto';

export const modelStatusSchema = z.enum(['draft', 'active', 'deprecated', 'disabled']);

export const createModelSchema = z.strictObject({
  providerId: z.string().min(1),
  slug: kebabCaseSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  externalModelId: z.string().trim().min(1).max(160),
  status: modelStatusSchema.default('draft'),
  capabilityMetadata: metadataSchema,
  pricingMetadata: metadataSchema,
  limitsMetadata: metadataSchema,
  schemaMetadata: metadataSchema,
});

export const updateModelSchema = z.strictObject({
  providerId: z.string().min(1).optional(),
  slug: kebabCaseSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  externalModelId: z.string().trim().min(1).max(160).optional(),
  status: modelStatusSchema.optional(),
  capabilityMetadata: metadataSchema.optional(),
  pricingMetadata: metadataSchema.optional(),
  limitsMetadata: metadataSchema.optional(),
  schemaMetadata: metadataSchema.optional(),
});

export const listModelsSchema = z.strictObject({
  providerId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  status: modelStatusSchema.optional(),
});

export type CreateModelDto = z.infer<typeof createModelSchema>;
export type UpdateModelDto = z.infer<typeof updateModelSchema>;
export type ListModelsDto = z.infer<typeof listModelsSchema>;
