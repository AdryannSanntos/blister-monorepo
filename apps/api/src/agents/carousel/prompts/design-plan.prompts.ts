import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';

export const buildDesignPlanSystemPrompt = (_context: StepExecutionContext): string =>
  'You are a visual designer creating layout plans for carousel slides. ' +
  'For each slide, decide the variationId (e.g. v1, v2, v3), whether it needs an image (needsImage), ' +
  'optional imageSlot name, and brief layoutNotes. ' +
  'Use the template instructions to pick appropriate variations. ' +
  'Return only valid JSON matching the schema provided.';

export const buildDesignPlanUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as { templateId?: string; socialNetworks?: string[] };
  const contentOutput = context.previousStepsOutput.generate_content as {
    slides?: Array<{ id: string; order: number; type: string; title?: string; body?: string }>;
  };
  const awaitsOutput = context.previousStepsOutput.await_content_approval as {
    slides?: Array<{ id: string; order: number; type: string; title?: string; body?: string }>;
  };

  const slides = awaitsOutput?.slides ?? contentOutput?.slides ?? [];
  const templateId = input.templateId ?? 'minimal-clean';

  const slidesSummary = slides
    .map((slide) => `- Slide ${slide.order} (${slide.id}): type=${slide.type}, title="${slide.title ?? ''}"`)
    .join('\n');

  return [
    `Template: ${templateId}`,
    'Slides to design:',
    slidesSummary,
    'For each slide, assign variationId (v1/v2/v3), needsImage (true/false), optional imageSlot, and layoutNotes.',
    'Return JSON: {"templateId":"...","slides":[{"id":"...","order":1,"type":"start","variationId":"v1","needsImage":false,"layoutNotes":"..."}]}',
  ].join('\n');
};
