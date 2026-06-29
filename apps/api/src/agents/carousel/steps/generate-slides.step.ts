import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import type { StepExecutionContext, StepExecutor } from '@company-os/agent-ia-sdk/agents';
import { carouselSlideTypeSchema } from '@company-os/types';
import { z } from 'zod';
import { buildSlidesSystemPrompt, buildSlidesUserPrompt } from '../prompts/slides.prompts';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { assembleSlideCss } from '../utils/brand-theme.util';
import { hydrateSlideHtml } from '../utils/slide-template-engine';
import {
  resolveSlideVariationId,
  resolveSlidesGenerationContext,
} from '../utils/slides-generation-context';

const generatedSlideLaxSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  htmlContent: z.string().optional(),
  cssContent: z.string().optional(),
  pngFileId: z.string().optional(),
});

const slidesLlmOutputLaxZod = z.object({
  slides: z.array(generatedSlideLaxSchema),
});

const normalizedSlideSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  htmlContent: z.string().min(1),
  cssContent: z.string(),
  pngFileId: z.string().optional(),
});

const resolveUploadedFileId = (
  slideId: string,
  slotKey: string,
  imageUploads: Record<string, string>,
): string | undefined => {
  const normalizedSlot = slotKey.toLowerCase();
  const candidates = [
    `${slideId}:${normalizedSlot}`,
    `${slideId}:${slotKey}`,
    slideId,
    normalizedSlot,
    slotKey,
  ];

  for (const key of candidates) {
    const fileId = imageUploads[key]?.trim();
    if (fileId) return fileId;
  }

  return undefined;
};

const resolveImageUrls = async (
  slideId: string,
  imageUploads: Record<string, string>,
  slotKeys: string[],
  deps: ReturnType<typeof getCarouselRunDeps>,
  context: StepExecutionContext,
): Promise<Record<string, string>> => {
  const urls: Record<string, string> = {};

  for (const slotKey of slotKeys) {
    const fileId = resolveUploadedFileId(slideId, slotKey, imageUploads);
    if (!fileId) continue;

    urls[slotKey.toLowerCase()] = await deps.resolveFileUrl({
      fileId,
      companyId: context.companyId,
    });
  }

  return urls;
};

const extractImageSlotKeys = (html: string): string[] => {
  const matches = html.matchAll(/\{\{(image_url(?:_\d+)?)\}\}/gi);
  return [...new Set([...matches].map((match) => match[1]?.toLowerCase()).filter(Boolean))] as string[];
};

export const resolveSlideImageSlotKeys = (
  slideId: string,
  html: string,
  plan?: { slides?: Array<{ id: string; imageSlots?: Array<{ slotKey: string }> }> },
): string[] => {
  const fromHtml = extractImageSlotKeys(html);
  const designSlide = plan?.slides?.find((entry) => entry.id === slideId);
  const fromPlan = (designSlide?.imageSlots ?? []).map((slot) => slot.slotKey.toLowerCase());

  return [...new Set([...fromPlan, ...fromHtml])];
};

const HYDRATION_PLACEHOLDER_PATTERN =
  /\{\{(brand|meta_right|title|subtitle|body|call_to_action|callToAction|ctaKeyword|cta_keyword|ctaHint|cta_hint|list_html|image_url|badge)\}\}/i;

export const resolveSlideHtmlContent = (
  llmHtml: string | undefined,
  templateHtml: string,
): string => {
  const trimmed = llmHtml?.trim();
  if (!trimmed) return templateHtml;
  if (!HYDRATION_PLACEHOLDER_PATTERN.test(trimmed)) return templateHtml;
  return trimmed;
};

export const normalizeGeneratedSlides = (
  data: z.infer<typeof slidesLlmOutputLaxZod>,
  context: StepExecutionContext,
) => {
  const { templateService } = getCarouselRunDeps();
  const generationContext = resolveSlidesGenerationContext(context);

  return data.slides.map((slide) => {
    const variationId = resolveSlideVariationId(slide.id, generationContext.plan);
    const variation = templateService.getSlideVariation(
      generationContext.templateId,
      slide.type,
      variationId,
    );

    const htmlContent = resolveSlideHtmlContent(slide.htmlContent, variation.html);
    const cssContent = assembleSlideCss({
      slideCss: slide.cssContent?.trim() || variation.css,
      brand: generationContext.brand,
    });

    return normalizedSlideSchema.parse({
      id: slide.id,
      order: slide.order,
      type: slide.type,
      htmlContent,
      cssContent,
      ...(slide.pngFileId ? { pngFileId: slide.pngFileId } : {}),
    });
  });
};

export const hydrateGeneratedSlides = async (
  data: z.infer<typeof slidesLlmOutputLaxZod>,
  context: StepExecutionContext,
) => {
  const deps = getCarouselRunDeps();
  const generationContext = resolveSlidesGenerationContext(context);
  const normalized = normalizeGeneratedSlides(data, context);

  const hydratedSlides = await Promise.all(
    normalized.map(async (slide) => {
      const contentSlide = generationContext.slides.find((entry) => entry.id === slide.id);
      const variationId = resolveSlideVariationId(slide.id, generationContext.plan);
      const slotKeys = resolveSlideImageSlotKeys(
        slide.id,
        slide.htmlContent,
        generationContext.plan,
      );
      const imageUrls = await resolveImageUrls(
        slide.id,
        generationContext.imageUploads,
        slotKeys,
        deps,
        context,
      );

      const htmlContent = hydrateSlideHtml({
        html: slide.htmlContent,
        slide: contentSlide ?? {
          id: slide.id,
          order: slide.order,
          type: slide.type,
        },
        variationId,
        brand: generationContext.brand,
        totalSlides: generationContext.totalSlides,
        imageUrls,
      });

      return { ...slide, htmlContent };
    }),
  );

  return hydratedSlides;
};

const llmGenerateSlidesStep = createLlmCallStep({
  outputSchema: slidesLlmOutputLaxZod,
  buildSystem: buildSlidesSystemPrompt,
  buildUser: buildSlidesUserPrompt,
});

export const createGenerateSlidesStep = (): StepExecutor => {
  return async (context, deps) => {
    const llmResult = await llmGenerateSlidesStep(context, deps);
    if (llmResult.type !== 'CONTINUE') return llmResult;

    const rawData = llmResult.output as z.infer<typeof slidesLlmOutputLaxZod> | undefined;
    if (!rawData?.slides?.length) return llmResult;

    try {
      const slides = await hydrateGeneratedSlides(rawData, context);

      return {
        ...llmResult,
        output: { slides },
      };
    } catch (error) {
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Slide hydration failed',
      };
    }
  };
};
