import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import {
  carouselImageSlotSchema,
  carouselNarrativeRoleSchema,
  carouselSlideTypeSchema,
  type CarouselSlideType,
} from '@company-os/types';
import { z } from 'zod';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { buildDesignPlanSystemPrompt, buildDesignPlanUserPrompt } from '../prompts/design-plan.prompts';
import {
  normalizeDesignPlanSlides,
  resolveSafeVariationId,
  type NormalizerContentSlide,
} from '../utils/design-plan-normalizer';
import {
  alignSlidesToContent,
  resolveContentSlidesFromContext,
} from '../utils/slide-count-alignment.util';

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

const resolveContentSlides = (context: StepExecutionContext) =>
  resolveContentSlidesFromContext<{
    id: string;
    order: number;
    type: CarouselSlideType;
    narrativeRole?: string;
    listItems?: string[];
    body?: string;
    body2?: string;
    subtitle?: string;
    callToAction?: string;
    imageBrief?: string;
  }>(context);

const toNormalizerContentSlides = (
  slides: Array<{
    id: string;
    order: number;
    type: string;
    narrativeRole?: string;
    listItems?: string[];
    body?: string;
    body2?: string;
    subtitle?: string;
    callToAction?: string;
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
    body2: slide.body2,
    subtitle: slide.subtitle,
    callToAction: slide.callToAction,
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

      const alignedSlides = alignSlidesToContent(
        rawContentSlides.map((slide) => ({
          id: slide.id,
          order: slide.order,
          type: carouselSlideTypeSchema.parse(slide.type),
        })),
        data.slides,
        (contentSlide) => ({
          variationId: contentSlide.type === 'start' ? 'v1' : 'v2',
          imageSlots: [] as z.infer<typeof designPlanLlmOutputZod>['slides'][number]['imageSlots'],
          layoutNotes: rawContentSlides.find((entry) => entry.id === contentSlide.id)?.imageBrief ?? '',
        }),
      );

      const slidesWithSlots = alignedSlides.map((slide) => {
        const contentSlide = rawContentSlides.find((entry) => entry.id === slide.id);
        const available = templateService.getAvailableVariations(data.templateId, slide.type);
        const variationId = resolveSafeVariationId(available, slide.variationId, slide.order);
        const manifestSlots = templateService.getImageSlotsForVariation(
          data.templateId,
          slide.type,
          variationId,
        );

        const imageSlots = templateService.toCarouselImageSlots(manifestSlots).map((slot) => ({
          ...slot,
          brief: contentSlide?.imageBrief ?? slide.layoutNotes,
        }));

        return {
          ...slide,
          variationId,
          imageSlots,
        };
      });

      const normalizedSlides = normalizeDesignPlanSlides(slidesWithSlots, contentSlides, {
        templateId: data.templateId,
        getAvailableVariations: (slideType) =>
          templateService.getAvailableVariations(data.templateId, slideType),
      });

      const slides = normalizedSlides.map((slide) => {
        const available = templateService.getAvailableVariations(data.templateId, slide.type);
        const variationId = resolveSafeVariationId(available, slide.variationId, slide.order);
        const manifestSlots = templateService.getImageSlotsForVariation(
          data.templateId,
          slide.type,
          variationId,
        );

        return {
          ...slide,
          variationId,
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
