import { z } from 'zod';

export const suspensionTypeSchema = z.enum(['clarification', 'form', 'validation']);
export const suspensionStatusSchema = z.enum(['pending', 'answered', 'cancelled']);

export const createRunSuspensionSchema = z.strictObject({
  runId: z.string().min(1),
  stepId: z.string().min(1).optional(),
  type: suspensionTypeSchema,
  resolvedPayload: z.record(z.string(), z.unknown()).default({}),
  roundNumber: z.number().int().positive().default(1),
});

export const createRunSuspensionResponseSchema = z.strictObject({
  suspensionId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  roundNumber: z.number().int().positive().default(1),
});

export type CreateRunSuspensionDto = z.infer<typeof createRunSuspensionSchema>;
export type CreateRunSuspensionResponseDto = z.infer<typeof createRunSuspensionResponseSchema>;
