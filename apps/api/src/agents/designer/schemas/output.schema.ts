import { z } from 'zod';

export const designerOutputZod = z.object({
  imageUrl: z.string().url().or(z.string().startsWith('data:')),
  storageKey: z.string().optional(),
  prompt: z.string().min(10).max(1000),
  style: z.enum([
    'minimalist',
    'vibrant',
    'professional',
    'rustic',
    'modern',
    'elegant',
    'playful',
    'vintage',
  ]),
  colors: z.array(z.string()).optional(),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export type DesignerOutput = z.infer<typeof designerOutputZod>;

export const designerOutputSchema = {
  type: 'object',
  properties: {
    imageUrl: { type: 'string', description: 'URL or data URI of generated image' },
    storageKey: { type: 'string', description: 'S3 storage key' },
    prompt: {
      type: 'string',
      description: 'Prompt used for image generation',
      minLength: 10,
      maxLength: 1000,
    },
    style: {
      type: 'string',
      enum: ['minimalist', 'vibrant', 'professional', 'rustic', 'modern', 'elegant', 'playful', 'vintage'],
    },
    colors: { type: 'array', items: { type: 'string' } },
    reviewStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
  },
  required: ['imageUrl', 'prompt', 'style'],
};

export const imagePromptSchema = {
  type: 'object',
  properties: {
    imagePrompt: {
      type: 'string',
      description: 'Detailed prompt for image generation',
    },
    style: {
      type: 'string',
      enum: ['minimalist', 'vibrant', 'professional', 'rustic', 'modern', 'elegant', 'playful', 'vintage'],
    },
    colors: {
      type: 'array',
      items: { type: 'string' },
      description: 'Suggested color palette',
    },
  },
  required: ['imagePrompt', 'style'],
};

export function validateDesignerOutput(output: unknown): {
  valid: boolean;
  data?: DesignerOutput;
  errors?: string[];
} {
  const result = designerOutputZod.safeParse(output);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
