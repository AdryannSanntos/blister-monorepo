import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildContentSystemPrompt, buildContentUserPrompt } from '../prompts/content.prompts';
import { carouselSlideTypeSchema } from '@company-os/types';

const contentLlmOutputZod = z.object({
  slides: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      type: carouselSlideTypeSchema,
      title: z.string().optional(),
      body: z.string().optional(),
      callToAction: z.string().optional(),
    }),
  ),
});

export const createGenerateContentStep = () =>
  createLlmCallStep({
    outputSchema: contentLlmOutputZod,
    buildSystem: buildContentSystemPrompt,
    buildUser: buildContentUserPrompt,
    transformOutput: (data) => ({ slides: data.slides }),
  });
