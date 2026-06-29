import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { resolveCarouselBrandContext } from '../utils/carousel-brand.util';
import { resolveSlidesGenerationContext } from '../utils/slides-generation-context';

export const buildContentSystemPrompt = (_context: StepExecutionContext): string =>
  [
    'You are a senior social-media copywriter for Instagram carousels.',
    'Write in Brazilian Portuguese (pt-BR).',
    'This step produces COPY for human review — plain text with lightweight emphasis markers only.',
    'Allowed markup: ==termo== for accent highlight (1–2 per title), **phrase** for bold emphasis in body/list.',
    'No HTML tags, no Markdown beyond == and **.',
    'Write with voice and specificity: tension, contrast, concrete examples, and a clear narrative arc across slides.',
    'Avoid generic filler ("no mundo de hoje", "é importante", "descubra como", "decisões otimizadas", "sugestões personalizadas").',
    'Each slide must describe a concrete scene: name the object, action, and result — not abstract promises.',
    'Avoid ambiguous pronouns like "ela" when the subject could be a device or AI — name the subject explicitly.',
    'Keep editorial tone consistent; business terms (briefing, call) are allowed when they fit the scene.',
    'Return only valid JSON matching the schema provided.',
  ].join(' ');

export const buildContentUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as {
    theme?: string;
    slidesCount?: number;
    selectedIdeaId?: string;
    brandOverrides?: { brandName?: string; instagramHandle?: string };
    settings?: unknown;
  };
  const ideasOutput = context.previousStepsOutput.generate_ideas as {
    ideas?: Array<{ id: string; title: string; description: string }>;
  };
  const awaitsOutput = context.previousStepsOutput.await_idea_selection as {
    selectedIdeaId?: string;
    ideas?: Array<{ id: string; title: string; description: string }>;
  };

  const selectedId = awaitsOutput?.selectedIdeaId ?? input.selectedIdeaId ?? '';
  const ideas = awaitsOutput?.ideas ?? ideasOutput?.ideas ?? [];
  const selectedIdea = ideas.find((idea) => idea.id === selectedId);

  const ideaContext = selectedIdea
    ? `Selected idea: "${selectedIdea.title}" — ${selectedIdea.description}`
    : `Theme: ${input.theme ?? 'general'}`;

  const slidesCount = input.slidesCount ?? 5;
  const brand = resolveCarouselBrandContext({
    brandOverrides: input.brandOverrides,
    agentSettings: input.settings,
  });

  const { templateService } = getCarouselRunDeps();
  const templateId =
    (input as { templateId?: string }).templateId ?? 'editorial-performance';
  const instructions = templateService.getInstructions(templateId);

  return [
    ideaContext,
    `Brand voice context: ${brand.brandName} (${brand.instagramHandle}).`,
    instructions ? `Template rules (follow narrative roles):\n${instructions.slice(0, 2500)}` : '',
    `Generate copy for exactly ${slidesCount} slides.`,
    'Each slide MUST include narrativeRole and every text field that will appear on the final slide.',
    'Vary slide shapes across the carousel — do NOT make every middle slide identical (title + short body + image).',
    '',
    'Slide structure by narrativeRole:',
    '- hook (slide 1, type "start"): title = headline (up to 12 words). subtitle = supporting line (max 120 chars). imageBrief = cover photo direction (required).',
    '- scene (middle slides): alternate formats:',
    '  A) type "text_image": title (use ==accent== on key term) + body with **bold** on metrics + imageBrief + optional callToAction (short punch line, MUST differ from body).',
    '  B) type "text_image": title + listItems (use **bold** on key words) + imageBrief + callToAction.',
    '  C) type "text": title + subtitle + listItems + callToAction — NO imageBrief.',
    '  D) type "text_image" with imageBrief describing "3 miniaturas verticais..." when showing multiple examples.',
    '- proof: type "text_image". title + body OR listItems + imageBrief + callToAction (one sentence takeaway, not a copy of body).',
    '- framework (before CTA): type "text". title + listItems (3–4 concrete pillars) + callToAction (max 80 chars). No imageBrief.',
    '- cta (last slide, type "text"): ctaKeyword (1–2 words). body (lead, max 160 chars). ctaHint (support line). callToAction (clear action).',
    '',
    'Diversity rules:',
    `- Among ${Math.max(slidesCount - 2, 1)} middle slides, include at least one type "text" slide without imageBrief.`,
    '- At least one scene slide must use listItems instead of a long body paragraph.',
    '- Do not repeat the same field pattern (title + body + image) on more than two consecutive slides.',
    '- callToAction must never duplicate body text — use a shorter closing insight or question.',
    '- imageBrief must describe a concrete visual (object, setting, framing) — required whenever type is "start" or "text_image".',
    'Do NOT repeat "em algum lugar, em algum protótipo, em alguma startup" patterns in the closing.',
    'Narrative: one dramatic arc across the day or journey — each slide must connect to the next.',
    'Plain text only.',
    'Return JSON: {"slides":[{"id":"slide_1","order":1,"type":"start","narrativeRole":"hook","title":"...","subtitle":"...","imageBrief":"..."}]}',
  ]
    .filter(Boolean)
    .join('\n');
};
