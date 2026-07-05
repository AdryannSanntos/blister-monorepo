import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildContentSystemPrompt, buildContentUserPrompt } from '../prompts/content.prompts';
import { carouselNarrativeRoleSchema, carouselSlideTypeSchema } from '@company-os/types';
import { normalizeCarouselSlideCopy } from '../utils/plain-text.util';
import { normalizeSlideCopy } from '../utils/normalize-slide-copy.util';
import {
  enforceContentSlidesCount,
  resolveExpectedSlidesCount,
} from '../utils/slide-count-alignment.util';
import { sanitizeContentLlmOutput } from '../utils/content-llm-output-sanitizer.util';
import {
  normalizeContentSlides,
  type NormalizableContentSlide,
} from '../utils/content-slides-normalizer';

const contentSlideLaxSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  narrativeRole: carouselNarrativeRoleSchema.optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  body2: z.string().optional(),
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
  const sanitized = sanitizeContentLlmOutput(raw);
  if (!sanitized || typeof sanitized !== 'object') return sanitized;
  const record = sanitized as { slides?: unknown };
  if (!Array.isArray(record.slides)) return sanitized;

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
    retry: { maxAttempts: 2, retryOn: ['parse_error', 'rate_limit', 'provider_error'] },
    transformOutput: (data, context) => {
      const templateId = (context.inputPayload as { templateId?: string }).templateId;
      const expectedCount = resolveExpectedSlidesCount(context);

      const slides = normalizeContentSlides(
        enforceContentSlidesCount(
          data.slides.map((slide): NormalizableContentSlide => {
            const parsed = contentSlideLaxSchema.parse(slide);
            const normalized = normalizeCarouselSlideCopy(parsed);
            return normalizeSlideCopy(
              {
                ...normalized,
                type: parsed.type,
                narrativeRole: parsed.narrativeRole,
              },
              { templateId },
            );
          }),
          expectedCount,
        ),
      );

      return { slides };
    },
  });
