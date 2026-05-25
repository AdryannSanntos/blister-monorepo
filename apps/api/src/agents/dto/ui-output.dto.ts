import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

export const uiOutputBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), value: z.string() }),
  z.strictObject({ type: z.literal('markdown'), value: z.string() }),
  z.strictObject({ type: z.literal('list'), items: z.array(z.string()) }),
  z.strictObject({
    type: z.literal('card'),
    title: z.string().min(1),
    body: z.string().optional(),
    metadata: jsonObjectSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('image'),
    url: z.string().min(1),
    alt: z.string().optional(),
    metadata: jsonObjectSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('cta'),
    label: z.string().min(1),
    action: z.record(z.string(), z.unknown()),
  }),
]);

export const uiOutputEnvelopeSchema = z.strictObject({
  blocks: z.array(uiOutputBlockSchema).default([]),
  metadata: jsonObjectSchema.optional(),
});

export type UiOutputBlockDto = z.infer<typeof uiOutputBlockSchema>;
export type UiOutputEnvelopeDto = z.infer<typeof uiOutputEnvelopeSchema>;
