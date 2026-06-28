import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';

export const buildSlidesSystemPrompt = (_context: StepExecutionContext): string =>
  'You are a frontend developer generating HTML and CSS for carousel slides. ' +
  'For each slide, generate htmlContent and cssContent based on the template and slide content. ' +
  'HTML must use the slide template classes. CSS overrides variables and layout specifics. ' +
  'Each slide gets a unique id, order, type, htmlContent, and cssContent. ' +
  'Return only valid JSON matching the schema provided.';

export const buildSlidesUserPrompt = (context: StepExecutionContext): string => {
  const contentOutput = context.previousStepsOutput.generate_content as {
    slides?: Array<{ id: string; order: number; type: string; title?: string; body?: string; callToAction?: string }>;
  };
  const awaitsContentOutput = context.previousStepsOutput.await_content_approval as {
    slides?: Array<{ id: string; order: number; type: string; title?: string; body?: string; callToAction?: string }>;
  };
  const designOutput = context.previousStepsOutput.generate_design_plan as {
    plan?: { templateId: string; slides: Array<{ id: string; variationId: string; layoutNotes: string }> };
  };
  const awaitsDesignOutput = context.previousStepsOutput.await_design_approval as {
    plan?: { templateId: string; slides: Array<{ id: string; variationId: string; layoutNotes: string }> };
    imageUploads?: Record<string, string>;
  };

  const slides = awaitsContentOutput?.slides ?? contentOutput?.slides ?? [];
  const plan = awaitsDesignOutput?.plan ?? designOutput?.plan;
  const imageUploads = awaitsDesignOutput?.imageUploads ?? {};

  const slidesContext = slides
    .map((slide) => {
      const design = plan?.slides?.find((d) => d.id === slide.id);
      const imageUrl = imageUploads[slide.id] ?? '';
      return [
        `Slide ${slide.order} (${slide.id}): type=${slide.type}`,
        `  title: "${slide.title ?? ''}"`,
        `  body: "${slide.body ?? ''}"`,
        `  callToAction: "${slide.callToAction ?? ''}"`,
        `  variationId: ${design?.variationId ?? 'v1'}`,
        `  layoutNotes: ${design?.layoutNotes ?? ''}`,
        `  imageUrl: ${imageUrl}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `Template: ${plan?.templateId ?? 'minimal-clean'}`,
    'Generate HTML and CSS for each slide:',
    slidesContext,
    'Return JSON: {"slides":[{"id":"...","order":1,"type":"start","htmlContent":"<div>...</div>","cssContent":".slide{...}"}]}',
  ].join('\n');
};
