import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildSlidesSystemPrompt, buildSlidesUserPrompt } from '../prompts/slides.prompts';
import { carouselSlideTypeSchema } from '@company-os/types';

const slidesLlmOutputZod = z.object({
  slides: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      type: carouselSlideTypeSchema,
      htmlContent: z.string(),
      cssContent: z.string(),
      pngFileId: z.string().optional(),
    }),
  ),
});

export const createGenerateSlidesStep = () =>
  createLlmCallStep({
    outputSchema: slidesLlmOutputZod,
    buildSystem: buildSlidesSystemPrompt,
    buildUser: buildSlidesUserPrompt,
    transformOutput: (data) => ({ slides: data.slides }),
  });
