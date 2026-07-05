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
import { dedupeCarouselSlidesById } from '../utils/carousel-output.util';
import { alignSlidesToContent, resolveContentSlidesFromContext } from '../utils/slide-count-alignment.util';

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

export const buildCarouselImagePlaceholderDataUri = (accentColor: string): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">',
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    `<stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25"/>`,
    `<stop offset="100%" stop-color="${accentColor}" stop-opacity="0.85"/>`,
    '</linearGradient></defs>',
    '<rect width="1080" height="1350" fill="url(#g)"/>',
    '</svg>',
  ].join('');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const resolveImageUrls = async (
  slideId: string,
  imageUploads: Record<string, string>,
  slotKeys: string[],
  accentColor: string,
  deps: ReturnType<typeof getCarouselRunDeps>,
  context: StepExecutionContext,
): Promise<Record<string, string>> => {
  const urls: Record<string, string> = {};

  for (const slotKey of slotKeys) {
    const normalizedKey = slotKey.toLowerCase();
    const fileId = resolveUploadedFileId(slideId, slotKey, imageUploads);

    if (fileId) {
      urls[normalizedKey] = await deps.resolveFileUrl({
        fileId,
        companyId: context.companyId,
      });
      continue;
    }

    urls[normalizedKey] = buildCarouselImagePlaceholderDataUri(accentColor);
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
  options?: { lockTemplate?: boolean },
): string => {
  if (options?.lockTemplate) return templateHtml;
  const trimmed = llmHtml?.trim();
  if (!trimmed) return templateHtml;
  if (!HYDRATION_PLACEHOLDER_PATTERN.test(trimmed)) return templateHtml;
  return trimmed;
};

export const alignSlidesLlmOutputToContent = (
  data: z.infer<typeof slidesLlmOutputLaxZod>,
  context: StepExecutionContext,
): z.infer<typeof slidesLlmOutputLaxZod> => {
  const contentSlides = resolveContentSlidesFromContext(context);

  if (contentSlides.length === 0) {
    return data;
  }

  return {
    slides: alignSlidesToContent(contentSlides, data.slides, () => ({})),
  };
};

export const normalizeGeneratedSlides = (
  data: z.infer<typeof slidesLlmOutputLaxZod>,
  context: StepExecutionContext,
) => {
  const { templateService } = getCarouselRunDeps();
  const generationContext = resolveSlidesGenerationContext(context);

  return dedupeCarouselSlidesById(
    data.slides.map((slide) => {
    const variationId = resolveSlideVariationId(slide.id, generationContext.plan);
    const variation = templateService.getSlideVariation(
      generationContext.templateId,
      slide.type,
      variationId,
    );

    const isContentMachine = generationContext.templateId === 'content-machine';

    const htmlContent = resolveSlideHtmlContent(slide.htmlContent, variation.html, {
      lockTemplate: isContentMachine,
    });
    const cssContent = assembleSlideCss({
      baseCss: variation.baseCss,
      slideCss: isContentMachine ? variation.css : slide.cssContent?.trim() || variation.css,
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
  }),
  );
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
        generationContext.brand.accentColor,
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
        templateId: generationContext.templateId,
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

const buildTemplateSlidesLlmOutput = (context: StepExecutionContext) => {
  const generationContext = resolveSlidesGenerationContext(context);
  return {
    slides: generationContext.slides.map((slide) => ({
      id: slide.id,
      order: slide.order,
      type: slide.type,
    })),
  };
};

export const createGenerateSlidesStep = (): StepExecutor => {
  return async (context, deps) => {
    const generationContext = resolveSlidesGenerationContext(context);

    if (generationContext.templateId === 'content-machine') {
      try {
        const alignedData = alignSlidesLlmOutputToContent(
          buildTemplateSlidesLlmOutput(context),
          context,
        );
        const slides = await hydrateGeneratedSlides(alignedData, context);
        return { type: 'CONTINUE', output: { slides } };
      } catch (error) {
        return {
          type: 'FAILED',
          error: error instanceof Error ? error.message : 'Slide hydration failed',
        };
      }
    }

    const llmResult = await llmGenerateSlidesStep(context, deps);
    if (llmResult.type !== 'CONTINUE') return llmResult;

    const rawData = llmResult.output as z.infer<typeof slidesLlmOutputLaxZod> | undefined;
    const alignedData = alignSlidesLlmOutputToContent(rawData ?? { slides: [] }, context);
    if (!alignedData.slides.length) return llmResult;

    try {
      const slides = await hydrateGeneratedSlides(alignedData, context);

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
