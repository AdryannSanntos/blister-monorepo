import { z } from 'zod';

export const updateSystemAgentConfigSchema = z
  .strictObject({
    providerId: z.string().min(1).nullable().optional(),
    modelId: z.string().min(1).nullable().optional(),
    temperature: z.number().min(0).max(2).nullable().optional(),
    maxOutputTokens: z.number().int().min(1).max(8192).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });

export type UpdateSystemAgentConfigDto = z.infer<typeof updateSystemAgentConfigSchema>;

export const testSystemAgentSchema = z.object({
  input: z.unknown().optional(),
  organizationId: z.string().min(1).optional(),
});

export type TestSystemAgentDto = z.infer<typeof testSystemAgentSchema>;
