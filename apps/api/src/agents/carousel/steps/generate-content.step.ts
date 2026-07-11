import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
  resolveSelectedIdea,
} from '../prompts/content.prompts';
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
  padContentSlidesToCount,
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

const mapLlmSlidesToContent = (
  slides: z.infer<typeof contentSlideLaxSchema>[],
): NormalizableContentSlide[] =>
  slides.map((slide) => {
    const parsed = contentSlideLaxSchema.parse(slide);
    return normalizeCarouselSlideCopy(parsed);
  });

const finalizeContentSlides = (
  slides: NormalizableContentSlide[],
  templateId?: string,
): NormalizableContentSlide[] =>
  normalizeContentSlides(slides).map((slide) => normalizeSlideCopy(slide, { templateId }));

export const createGenerateContentStep = () =>
  createLlmCallStep({
    outputSchema: contentLlmOutputZod,
    buildSystem: buildContentSystemPrompt,
    buildUser: buildContentUserPrompt,
    repair: repairContentOutput,
    // Full pt-BR copy for every slide can be long; keep generous headroom so
    // larger carousels don't get truncated mid-array (which surfaces as
    // "Invalid JSON" or a short slide count) instead of returning the full set.
    maxTokens: 16000,
    retry: { maxAttempts: 3, retryOn: ['parse_error', 'rate_limit', 'provider_error'] },
    // On the happy path the LLM returns the full set; an under-delivery throws
    // here, which triggers a corrective retry (buildContentUserPrompt appends a
    // correction telling the model exactly what to fix).
    transformOutput: (data, context) => {
      const templateId = (context.inputPayload as { templateId?: string }).templateId;
      const expectedCount = resolveExpectedSlidesCount(context);
      const mapped = mapLlmSlidesToContent(data.slides);

      return {
        slides: finalizeContentSlides(enforceContentSlidesCount(mapped, expectedCount), templateId),
      };
    },
    // Last resort: if the model still under-delivers after every retry, pad the
    // best attempt up to the requested count instead of failing the whole run.
    // The synthesized slides are placeholders the user edits at the
    // content-approval step, so the pipeline always reaches a reviewable state.
    fallbackOnExhausted: (context, { lastData }) => {
      const templateId = (context.inputPayload as { templateId?: string }).templateId;
      const expectedCount = resolveExpectedSlidesCount(context);
      const mapped = mapLlmSlidesToContent(lastData?.slides ?? []);

      return {
        slides: finalizeContentSlides(
          padContentSlidesToCount(mapped, expectedCount, resolveSelectedIdea(context)),
          templateId,
        ),
      };
    },
  });
