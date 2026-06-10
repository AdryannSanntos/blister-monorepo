import { defineAgentSchemas } from '@company-os/agent-sdk';
import { z } from 'zod';

export const copywriterSchemas = defineAgentSchemas({
  input: z.object({
    userInput: z
      .string()
      .min(5, 'Descreva o que você precisa com pelo menos 5 caracteres')
      .max(1000),
  }),
  llmOutput: z.object({
    caption: z
      .string()
      .min(10, 'A legenda deve ter pelo menos 10 caracteres')
      .max(2200, 'A legenda não pode exceder 2200 caracteres'),
    hashtags: z
      .array(z.string().regex(/^#?[\w]+$/))
      .min(3, 'Inclua pelo menos 3 hashtags')
      .max(30, 'Máximo de 30 hashtags'),
    tone: z.enum(['professional', 'casual', 'enthusiastic', 'informative', 'friendly']),
  }),
  output: z.object({
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
  }),
});

export const copywriterInputZod = copywriterSchemas.zod.input;
export const copywriterLlmOutputZod = copywriterSchemas.zod.llmOutput;
export const copywriterOutputZod = copywriterSchemas.zod.output;

export type CopywriterOutput = z.infer<typeof copywriterOutputZod>;
