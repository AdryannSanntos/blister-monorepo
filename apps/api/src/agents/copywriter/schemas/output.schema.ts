import { z } from 'zod';

export const copywriterOutputZod = z.object({
  caption: z
    .string()
    .min(10, 'A legenda deve ter pelo menos 10 caracteres')
    .max(2200, 'A legenda não pode exceder 2200 caracteres'),
  hashtags: z
    .array(z.string().regex(/^#?[\w]+$/))
    .min(3, 'Inclua pelo menos 3 hashtags')
    .max(30, 'Máximo de 30 hashtags'),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'informative', 'friendly']),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export type CopywriterOutput = z.infer<typeof copywriterOutputZod>;

export const copywriterOutputSchema = {
  type: 'object',
  properties: {
    caption: {
      type: 'string',
      description: 'Legenda para o post',
      minLength: 10,
      maxLength: 2200,
    },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 30,
      description: 'Lista de hashtags relevantes',
    },
    tone: {
      type: 'string',
      enum: ['professional', 'casual', 'enthusiastic', 'informative', 'friendly'],
      description: 'Tom da legenda',
    },
    reviewStatus: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      description: 'Status de revisão',
    },
  },
  required: ['caption', 'hashtags', 'tone'],
};

export function validateCopywriterOutput(output: unknown): {
  valid: boolean;
  data?: CopywriterOutput;
  errors?: string[];
} {
  const result = copywriterOutputZod.safeParse(output);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
