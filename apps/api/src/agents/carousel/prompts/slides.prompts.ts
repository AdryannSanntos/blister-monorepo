import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import {
  resolveSlideVariationId,
  resolveSlidesGenerationContext,
} from '../utils/slides-generation-context';

export const buildSlidesSystemPrompt = (_context: StepExecutionContext): string =>
  [
    'You are a senior frontend designer generating HTML and CSS for Instagram carousel slides.',
    'Use the reference template as a starting point — you MAY adapt layout for better rhythm:',
    '- adjust vertical spacing, reorder blocks, or omit optional sections (e.g. drop closing paragraph if no callToAction)',
    '- add/remove wrapper divs using existing template BEM classes',
    '- never invent new placeholder keys',
    'MUST keep injectable placeholders for server hydration: {{brand}}, {{meta_right}}, {{title}}, {{body}}, {{subtitle}}, {{call_to_action}}, {{ctaKeyword}}, {{ctaHint}}, {{list_html}}, {{image_url}}, {{badge}}, {{slide_current}}, {{slide_total}}, {{progress}}.',
    'Copy arrives pre-marked with ==accent== and **bold** — keep those markers inside placeholders, do not strip them.',
    'Return htmlContent + cssContent per slide. CSS may extend reference with spacing/typography tweaks.',
    'Return only valid JSON matching the schema provided.',
  ].join(' ');

export const buildSlidesUserPrompt = (context: StepExecutionContext): string => {
  const { templateId, slides, plan, imageUploads, brand } = resolveSlidesGenerationContext(context);
  const { templateService } = getCarouselRunDeps();

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
        `  callToAction: "${slide.callToAction ?? ''}"`,
        `  ctaKeyword: "${slide.ctaKeyword ?? ''}"`,
        `  listItems: ${slide.listItems?.length ? slide.listItems.join(' | ') : 'none'}`,
        `  variationId: ${variationId}`,
        `  layoutNotes: ${design?.layoutNotes ?? ''}`,
        `  imageSlots: ${slotUrls || 'none'}`,
        `  reference HTML:\n${variation.html}`,
        `  reference CSS:\n${variation.css}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `Template: ${templateId}`,
    `Brand: ${brand.brandName} (${brand.instagramHandle})`,
    'Generate HTML/CSS per slide from the references below.',
    'Adapt each layout for readability — generous spacing between title and body (32px+), do not cram blocks.',
    'Omit {{call_to_action}} block entirely when the slide has no closing line in the brief.',
    'Preserve ==accent== and **bold** markers inside {{title}} and {{body}} placeholders.',
    slidesContext,
    'Return JSON with one entry per slide above. Each entry needs id, order, type, htmlContent, and cssContent.',
    'Return JSON: {"slides":[{"id":"...","order":1,"type":"start","htmlContent":"<div>...</div>","cssContent":".slide{...}"}]}',
  ].join('\n');
};
