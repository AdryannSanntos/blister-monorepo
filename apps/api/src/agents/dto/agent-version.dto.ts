import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

export const saveDraftVersionSchema = z.strictObject({
  flowDefinition: jsonObjectSchema,
  inputSchema: jsonObjectSchema,
  outputSchema: jsonObjectSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const publishVersionSchema = z.strictObject({});

export type SaveDraftVersionDto = z.infer<typeof saveDraftVersionSchema>;
