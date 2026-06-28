import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildDesignPlanSystemPrompt, buildDesignPlanUserPrompt } from '../prompts/design-plan.prompts';
import { carouselSlideTypeSchema } from '@company-os/types';

const designPlanLlmOutputZod = z.object({
  templateId: z.string(),
  slides: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      type: carouselSlideTypeSchema,
      variationId: z.string(),
      needsImage: z.boolean(),
      imageSlot: z.string().optional(),
      imageFileId: z.string().optional(),
      layoutNotes: z.string(),
    }),
  ),
});

export const createGenerateDesignPlanStep = () =>
  createLlmCallStep({
    outputSchema: designPlanLlmOutputZod,
    buildSystem: buildDesignPlanSystemPrompt,
    buildUser: buildDesignPlanUserPrompt,
    transformOutput: (data) => ({ plan: data }),
  });
