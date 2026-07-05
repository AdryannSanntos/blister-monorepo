import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { summarizeVariationForPrompt } from '../utils/slide-variation-prompt.util';
import {
  resolveSlideVariationId,
  resolveSlidesGenerationContext,
} from '../utils/slides-generation-context';

export const buildSlidesSystemPrompt = (context: StepExecutionContext): string => {
  const templateId =
    (context.inputPayload as { templateId?: string }).templateId ?? 'editorial-performance';
  const isContentMachine = templateId === 'content-machine';

  return [
    'You are a senior frontend designer generating HTML and CSS for Instagram carousel slides.',
    isContentMachine
      ? 'For Content Machine: return reference HTML/CSS unchanged — the server discards layout edits and uses disk templates only.'
      : [
          'Use the reference template as a starting point — you MAY adapt layout for better rhythm:',
          '- adjust vertical spacing, reorder blocks, or omit optional sections (e.g. drop closing paragraph if no callToAction)',
          '- add/remove wrapper divs using existing template BEM classes',
        ].join('\n'),
    '- never invent new placeholder keys',
    'MUST keep injectable placeholders for server hydration: {{brand}}, {{meta_right}}, {{meta_center}}, {{meta_year}}, {{title}}, {{body}}, {{body2}}, {{subtitle}}, {{call_to_action}}, {{ctaKeyword}}, {{ctaHint}}, {{list_html}}, {{image_url}}, {{badge}}, {{slide_current}}, {{slide_total}}, {{progress}}.',
    'Copy arrives pre-marked with ==accent== and **bold** — keep those markers inside placeholders, do not strip them.',
    isContentMachine
      ? 'Return htmlContent + cssContent mirroring the reference files exactly.'
      : 'Return htmlContent + cssContent per slide. CSS may extend reference with spacing/typography tweaks.',
    'Return only valid JSON matching the schema provided.',
  ].join(' ');
};

export const buildSlidesUserPrompt = (context: StepExecutionContext): string => {
  const { templateId, slides, plan, imageUploads, brand } = resolveSlidesGenerationContext(context);
  const { templateService } = getCarouselRunDeps();

  const isContentMachine = templateId === 'content-machine';
  const templateInstructions = templateService.getInstructions(templateId);

  const slidesContext = slides
    .map((slide) => {
      const variationId = resolveSlideVariationId(slide.id, plan);
      const variation = templateService.getSlideVariation(templateId, slide.type, variationId);
      const design = plan?.slides?.find((entry) => entry.id === slide.id);
      const designSlots = design?.imageSlots ?? [];

      const slotUrls = designSlots
        .map((slot) => {
          const fileId = slot.fileId;
          const uploadedUrl = imageUploads[`${slide.id}:${slot.slotKey}`] ?? imageUploads[slide.id];
          return `${slot.slotKey}: ${uploadedUrl ? 'uploaded' : fileId ?? '(pending upload)'}`;
        })
        .join(', ');

      return [
        `Slide ${slide.order} (${slide.id}): type=${slide.type}`,
        `  narrativeRole: ${slide.narrativeRole ?? 'scene'}`,
        `  title: "${slide.title ?? ''}"`,
        `  subtitle: "${slide.subtitle ?? ''}"`,
        `  body: "${slide.body ?? ''}"`,
        `  body2: "${slide.body2 ?? ''}"`,
        `  callToAction: "${slide.callToAction ?? ''}"`,
        `  ctaKeyword: "${slide.ctaKeyword ?? ''}"`,
        `  listItems: ${slide.listItems?.length ? slide.listItems.join(' | ') : 'none'}`,
        `  variationId: ${variationId}`,
        `  layoutNotes: ${design?.layoutNotes ?? ''}`,
        `  imageSlots: ${slotUrls || 'none'}`,
        `  templateSummary: ${summarizeVariationForPrompt(variation.html)}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `Template: ${templateId}`,
    `Brand: ${brand.brandName} (${brand.instagramHandle})`,
    templateInstructions ? `Template instructions:\n${templateInstructions}` : '',
    'Generate HTML/CSS per slide from the variation summaries below. Disk templates supply base CSS — only return cssContent when you need spacing/typography overrides.',
    'Adapt each layout for readability — generous spacing between title and body (32px+), do not cram blocks.',
    'Omit {{call_to_action}} block entirely when the slide has no closing line in the brief.',
    isContentMachine
      ? 'Content Machine rules: use reference HTML/CSS exactly — do NOT change font-size, gap, flex/grid structure, or layout classes. Server uses disk templates only.'
      : 'For the final CTA slide (text v3 / slide-close): dark theme, badge, recap body, large keyword title, hint subtitle, accent action pill — never use a bordered white box.',
    'Preserve ==accent== and **bold** markers inside text placeholders.',
    slidesContext,
    'Return JSON with one entry per slide above. Each entry needs id, order, type, htmlContent, and cssContent.',
    'Return JSON: {"slides":[{"id":"...","order":1,"type":"start","htmlContent":"<div>...</div>","cssContent":".slide{...}"}]}',
  ].filter(Boolean).join('\n');
};
