import { z } from 'zod';

export const uiOutputBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({ type: z.literal('markdown'), value: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({ type: z.literal('card'), title: z.string(), body: z.string().optional() }),
  z.object({ type: z.literal('image'), url: z.string().min(1) }),
  z.object({
    type: z.literal('cta'),
    label: z.string(),
    action: z.record(z.string(), z.unknown()),
  }),
]);

export const uiOutputEnvelopeSchema = z.object({
  blocks: z.array(uiOutputBlockSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UiOutputBlock = z.infer<typeof uiOutputBlockSchema>;
export type UiOutputEnvelope = z.infer<typeof uiOutputEnvelopeSchema>;
