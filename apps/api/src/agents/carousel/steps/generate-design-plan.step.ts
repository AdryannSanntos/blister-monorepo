import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import {
  carouselImageSlotSchema,
  carouselNarrativeRoleSchema,
  carouselSlideTypeSchema,
} from '@company-os/types';
import { z } from 'zod';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { buildDesignPlanSystemPrompt, buildDesignPlanUserPrompt } from '../prompts/design-plan.prompts';
import {
  normalizeDesignPlanSlides,
  type NormalizerContentSlide,
} from '../utils/design-plan-normalizer';

const designPlanLlmOutputZod = z.object({
  templateId: z.string(),
  slides: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      type: carouselSlideTypeSchema,
      variationId: z.string(),
      imageSlots: z.array(carouselImageSlotSchema).default([]),
      layoutNotes: z.string(),
    }),
  ),
});

const resolveContentSlides = (context: StepExecutionContext) => {
  const contentOutput = context.previousStepsOutput.generate_content as {
    slides?: Array<{
      id: string;
      order: number;
      type: string;
      narrativeRole?: string;
      listItems?: string[];
      body?: string;
      imageBrief?: string;
    }>;
  };
  const awaitsOutput = context.previousStepsOutput.await_content_approval as {
    slides?: Array<{
      id: string;
      order: number;
      type: string;
      narrativeRole?: string;
      listItems?: string[];
      body?: string;
      imageBrief?: string;
    }>;
  };
  return awaitsOutput?.slides ?? contentOutput?.slides ?? [];
};

const toNormalizerContentSlides = (
  slides: Array<{
    id: string;
    order: number;
    type: string;
    narrativeRole?: string;
    listItems?: string[];
    body?: string;
    imageBrief?: string;
  }>,
): NormalizerContentSlide[] =>
  slides.map((slide) => ({
    id: slide.id,
    order: slide.order,
    type: carouselSlideTypeSchema.parse(slide.type),
    narrativeRole: slide.narrativeRole
      ? carouselNarrativeRoleSchema.parse(slide.narrativeRole)
      : undefined,
    listItems: slide.listItems,
    body: slide.body,
    imageBrief: slide.imageBrief,
  }));

export const createGenerateDesignPlanStep = () =>
  createLlmCallStep({
    outputSchema: designPlanLlmOutputZod,
    buildSystem: buildDesignPlanSystemPrompt,
    buildUser: buildDesignPlanUserPrompt,
    transformOutput: (data, context) => {
      const { templateService } = getCarouselRunDeps();
      const rawContentSlides = resolveContentSlides(context);
      const contentSlides = toNormalizerContentSlides(rawContentSlides);

      const slidesWithSlots = data.slides.map((slide) => {
        const contentSlide = rawContentSlides.find((entry) => entry.id === slide.id);
        const manifestSlots = templateService.getImageSlotsForVariation(
          data.templateId,
          slide.type,
          slide.variationId,
        );

        const imageSlots = templateService.toCarouselImageSlots(manifestSlots).map((slot) => ({
          ...slot,
          brief: contentSlide?.imageBrief ?? slide.layoutNotes,
        }));

        return {
          ...slide,
          imageSlots,
        };
      });

      const normalizedSlides = normalizeDesignPlanSlides(slidesWithSlots, contentSlides);

      const slides = normalizedSlides.map((slide) => {
        const manifestSlots = templateService.getImageSlotsForVariation(
          data.templateId,
          slide.type,
          slide.variationId,
        );

        return {
          ...slide,
          imageSlots: templateService.toCarouselImageSlots(manifestSlots).map((slot) => {
            const contentSlide = rawContentSlides.find((entry) => entry.id === slide.id);
            return {
              ...slot,
              brief: contentSlide?.imageBrief ?? slide.layoutNotes,
            };
          }),
        };
      });

      return { plan: { templateId: data.templateId, slides } };
    },
  });
