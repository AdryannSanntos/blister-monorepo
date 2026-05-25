import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

export const runSuspensionTypeSchema = z.enum(['clarification', 'form', 'validation']);
export const runSuspensionStatusSchema = z.enum(['pending', 'answered', 'cancelled']);

export const runSuspensionResolvedPayloadSchema = z.strictObject({
  title: z.string().trim().min(1).max(160).optional(),
  prompt: z.string().trim().min(1).optional(),
  fields: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        label: z.string().trim().min(1).max(160),
        type: z.enum(['text', 'textarea', 'single_select', 'multi_select', 'number', 'boolean']),
        required: z.boolean().default(false),
        options: z.array(z.string().trim().min(1)).optional(),
        allowOther: z.boolean().optional(),
      }),
    )
    .optional(),
  metadata: jsonObjectSchema.optional(),
});

export const createRunSuspensionResponseSchema = z.strictObject({
  suspensionId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  metadata: jsonObjectSchema.optional(),
});

export type RunSuspensionTypeDto = z.infer<typeof runSuspensionTypeSchema>;
export type CreateRunSuspensionResponseDto = z.infer<typeof createRunSuspensionResponseSchema>;
