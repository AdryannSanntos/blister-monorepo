import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';

export const buildDesignPlanSystemPrompt = (_context: StepExecutionContext): string =>
  'Você é um designer visual criando planos de layout para slides de carrossel. ' +
  'Responda inteiramente em português brasileiro (pt-BR). ' +
  'Para cada slide, decida o variationId (ex: v1, v2, v3) e escreva layoutNotes detalhados. ' +
  'Os image slots são definidos pelo manifest do template — não invente chaves de slot. ' +
  'Use as instruções do template para escolher as variações apropriadas. ' +
  'OBRIGATÓRIO variar layouts entre slides consecutivos — nunca repita o mesmo variationId três vezes seguidas. ' +
  'layoutNotes deve ter 2 a 3 frases em português descrevendo: (1) a hierarquia visual dos blocos de texto, (2) a posição da imagem em relação ao texto, (3) a cor ou contraste dominante, e (4) qualquer ênfase tipográfica relevante. ' +
  'Retorne apenas JSON válido de acordo com o schema fornecido.';

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
  const slides = contentOutput?.slides ?? [];
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
            ? slide.imageBrief
              ? slide.narrativeRole === 'proof'
                ? 'PREFER: text-image/bottom-{dark|white|accent} (claim first, image as proof below)'
                : 'PREFER: text-image/{start|center|bottom}-{dark|white|accent}. Position: start=image leads, center=image between two texts, bottom=image below the texts. Theme: dark|white|accent. Alternate BOTH position and theme from the previous slide.'
              : 'PREFER: text/v1 (accent), v3 (dark) or v4 (light) — text-only, denser copy'
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
