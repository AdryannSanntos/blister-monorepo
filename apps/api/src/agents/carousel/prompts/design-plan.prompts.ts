import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';

export const buildDesignPlanSystemPrompt = (_context: StepExecutionContext): string =>
  'You are a visual designer creating layout plans for carousel slides. ' +
  'For each slide, decide the variationId (e.g. v1, v2, v3) and brief layoutNotes. ' +
  'Image slots are defined by the template manifest — do not invent slot keys. ' +
  'Use the template instructions to pick appropriate variations. ' +
  'MUST vary layouts across consecutive slides — never pick the same variationId three times in a row. ' +
  'Return only valid JSON matching the schema provided.';

export const buildDesignPlanUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as { templateId?: string; socialNetworks?: string[] };
  const contentOutput = context.previousStepsOutput.generate_content as {
    slides?: Array<{
      id: string;
      order: number;
      type: string;
      narrativeRole?: string;
      title?: string;
      subtitle?: string;
      body?: string;
      callToAction?: string;
      listItems?: string[];
      imageBrief?: string;
    }>;
  };
  const awaitsOutput = context.previousStepsOutput.await_content_approval as {
    slides?: Array<{
      id: string;
      order: number;
      type: string;
      narrativeRole?: string;
      title?: string;
      subtitle?: string;
      body?: string;
      callToAction?: string;
      listItems?: string[];
      imageBrief?: string;
    }>;
  };

  const slides = awaitsOutput?.slides ?? contentOutput?.slides ?? [];
  const templateId = input.templateId ?? 'editorial-performance';
  const totalSlides = slides.length;
  const isContentMachine = templateId === 'content-machine';
  const { templateService } = getCarouselRunDeps();
  const instructions = templateService.getInstructions(templateId);

  const slidesSummary = slides
    .map((slide) => {
      const isFirst = slide.order === 1;
      const isLast = slide.order === totalSlides;
      const variations = templateService.getAvailableVariations(templateId, slide.type);
      const variationDetails = variations
        .map((variationId) => {
          const slots = templateService.getImageSlotsForVariation(
            templateId,
            slide.type,
            variationId,
          );
          const slotSummary =
            slots.length > 0
              ? slots.map((slot) => `${slot.slotKey} (${slot.label})`).join(', ')
              : 'no image slots';
          return `${variationId}: ${slotSummary}`;
        })
        .join(' | ');

      const forcedVariation = isFirst
        ? 'REQUIRED: variationId v1 (start cover)'
        : isLast
          ? isContentMachine
            ? 'REQUIRED: type=text, variationId v2 (closing accent box)'
            : 'REQUIRED: variationId v3 when type=text (CTA closing)'
          : isContentMachine
            ? slide.narrativeRole === 'proof'
              ? 'PREFER: text-image/v2 (image bottom) or v4 (image top) or v5 (image after text)'
              : slide.imageBrief && slide.callToAction && !slide.subtitle
                ? 'PREFER: text-image/v1 (accent card)'
                : slide.imageBrief && slide.subtitle
                  ? 'PREFER: text-image/v3 (sandwich), v5 (stack), or v4 (image first) — vary from previous slide'
                  : slide.imageBrief
                    ? 'PREFER: rotate text-image/v2, v3, v4, v5 — never repeat same layout twice in a row'
                    : 'PREFER: text/v1, v3, or v4 (text-only, denser copy)'
            : slide.listItems?.length
              ? 'PREFER: text/v1 or text/v2 for lists; text-image/v2 for list + visual card'
              : slide.narrativeRole === 'proof'
                ? 'PREFER: text-image/v1 (dark proof) or v5 (orange framework)'
                : 'PREFER: text-image/v2 or v4 for scenes with visuals';

      return [
        `- Slide ${slide.order} (${slide.id}): type=${slide.type}, narrativeRole=${slide.narrativeRole ?? 'scene'}`,
        `  title="${slide.title ?? ''}"`,
        `  body excerpt="${(slide.body ?? '').slice(0, 120)}..."`,
        `  listItems=${slide.listItems?.length ?? 0}`,
        `  imageBrief="${slide.imageBrief ?? ''}"`,
        `  layout rule: ${forcedVariation}`,
        `  available variations: ${variationDetails || 'v1'}`,
      ].join('\n');
    })
    .join('\n');

  return [
    `Template: ${templateId}`,
    instructions ? `Template instructions:\n${instructions}` : '',
    'Slides to design:',
    slidesSummary,
    'For each slide, assign variationId and layoutNotes describing visual composition.',
    'layoutNotes must reference the imageBrief when the variation needs images.',
    'Return JSON: {"templateId":"...","slides":[{"id":"...","order":1,"type":"start","variationId":"v1","imageSlots":[],"layoutNotes":"..."}]}',
    'imageSlots will be merged from the template manifest after generation.',
  ]
    .filter(Boolean)
    .join('\n');
};
