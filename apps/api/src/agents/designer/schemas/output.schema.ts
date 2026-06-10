import { defineAgentSchemas } from '@company-os/agent-sdk';
import { z } from 'zod';

const styleEnum = z.enum([
  'minimalist',
  'vibrant',
  'professional',
  'rustic',
  'modern',
  'elegant',
  'playful',
  'vintage',
]);

export const imagePromptZod = z.object({
  imagePrompt: z.string().min(10).max(1000),
  style: styleEnum,
  colors: z.array(z.string()).optional(),
});

export const designerSchemas = defineAgentSchemas({
  input: z.object({
    userInput: z.string().min(5).max(1000),
  }),
  llmOutput: imagePromptZod,
  output: z.object({
    imageUrl: z.string().url().or(z.string().startsWith('data:')),
    storageKey: z.string().optional(),
    prompt: z.string().min(10).max(1000),
    style: styleEnum,
    colors: z.array(z.string()).optional(),
    reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  }),
});

export const designerInputZod = designerSchemas.zod.input;
export const designerLlmOutputZod = designerSchemas.zod.llmOutput;
export const designerOutputZod = designerSchemas.zod.output;

export type DesignerOutput = z.infer<typeof designerOutputZod>;
