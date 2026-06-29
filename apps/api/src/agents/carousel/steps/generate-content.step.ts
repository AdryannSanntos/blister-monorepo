import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildContentSystemPrompt, buildContentUserPrompt } from '../prompts/content.prompts';
import { carouselNarrativeRoleSchema, carouselSlideTypeSchema } from '@company-os/types';
import { normalizeCarouselSlideCopy } from '../utils/plain-text.util';
import { applyCopyLimits } from '../utils/copy-limits.util';
import { normalizeContentSlides } from '../utils/content-slides-normalizer';

const contentSlideLaxSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  narrativeRole: carouselNarrativeRoleSchema.optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  callToAction: z.string().optional(),
  ctaKeyword: z.string().optional(),
  ctaHint: z.string().optional(),
  imageBrief: z.string().optional(),
  listItems: z.array(z.string()).optional(),
});

const contentLlmOutputZod = z.object({
  slides: z.array(contentSlideLaxSchema),
});

const repairContentOutput = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw;
  const record = raw as { slides?: unknown };
  if (!Array.isArray(record.slides)) return raw;

  return {
    ...record,
    slides: record.slides.map((slide) => {
      if (!slide || typeof slide !== 'object') return slide;
      return normalizeCarouselSlideCopy(slide as Parameters<typeof normalizeCarouselSlideCopy>[0]);
    }),
  };
};

export const createGenerateContentStep = () =>
  createLlmCallStep({
    outputSchema: contentLlmOutputZod,
    buildSystem: buildContentSystemPrompt,
    buildUser: buildContentUserPrompt,
    repair: repairContentOutput,
    transformOutput: (data) => ({
      slides: normalizeContentSlides(
        data.slides.map((slide) =>
          applyCopyLimits(normalizeCarouselSlideCopy(slide)),
        ),
      ),
    }),
  });
