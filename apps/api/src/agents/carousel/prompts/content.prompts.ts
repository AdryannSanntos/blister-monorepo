import type { LlmRetryContext, StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';
import { resolveCarouselBrandContext } from '../utils/carousel-brand.util';
import { resolveExpectedSlidesCount } from '../utils/slide-count-alignment.util';
import { resolveSlidesGenerationContext } from '../utils/slides-generation-context';

/**
 * Resolves the idea the user selected (or the raw theme) from the run context.
 * Shared by the prompt builder and the content step's under-delivery fallback
 * so both describe the carousel from the same source of truth.
 */
export const resolveSelectedIdea = (
  context: StepExecutionContext,
): { title?: string; description?: string } => {
  const input = context.inputPayload as {
    theme?: string;
    selectedIdeaId?: string;
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

  return {
    title: selectedIdea?.title ?? input.theme,
    description: selectedIdea?.description,
  };
};

export const buildContentSystemPrompt = (_context: StepExecutionContext): string =>
  [
    'You are a senior social-media copywriter for Instagram carousels.',
    'Write in Brazilian Portuguese (pt-BR).',
    'This step produces COPY for human review — plain text with lightweight emphasis markers only.',
    'Allowed markup: ==termo== for accent highlight (1–2 per title), **phrase** for bold emphasis in body/list.',
    'No HTML tags, no Markdown beyond == and **.',
    'IMPORTANT: Never embed literal \\n sequences or backslash-n inside JSON string values. Each field value must be a single continuous string — multi-line text is allowed via real line breaks, but not the two-character sequence backslash-n.',
    'Do not use em-dashes (—) as separators or fillers inside a single field value.',
    'Write with voice and specificity: tension, contrast, concrete examples, and a clear narrative arc across slides.',
    'Avoid generic filler ("no mundo de hoje", "é importante", "descubra como", "decisões otimizadas", "sugestões personalizadas").',
    'Each slide must describe a concrete scene: name the object, action, and result — not abstract promises.',
    'Never write Instagram post captions or hashtag blocks (#tag). Hashtags belong in the publish caption, not inside carousel slides.',
    'Avoid ambiguous pronouns like "ela" when the subject could be a device or AI — name the subject explicitly.',
    'Keep editorial tone consistent; business terms (briefing, call) are allowed when they fit the scene.',
    'Return only valid JSON matching the schema provided.',
  ].join(' ');

export const buildContentUserPrompt = (
  context: StepExecutionContext,
  retry?: LlmRetryContext,
): string => {
  const input = context.inputPayload as {
    theme?: string;
    slidesCount?: number;
    selectedIdeaId?: string;
    brandOverrides?: { brandName?: string; instagramHandle?: string };
    settings?: unknown;
  };
  const idea = resolveSelectedIdea(context);

  const ideaContext = idea.title
    ? idea.description
      ? `Selected idea: "${idea.title}" — ${idea.description}`
      : `Theme: ${idea.title}`
    : `Theme: ${input.theme ?? 'general'}`;

  const slidesCount = resolveExpectedSlidesCount(context);
  const brand = resolveCarouselBrandContext({
    brandOverrides: input.brandOverrides,
    agentSettings: input.settings,
  });

  const { templateService } = getCarouselRunDeps();
  const templateId =
    (input as { templateId?: string }).templateId ?? 'editorial-performance';
  const instructions = templateService.getInstructions(templateId);
  const isContentMachine = templateId === 'content-machine';

  const contentMachineStructurePrompt = [
    'Slide structure for Content Machine template:',
    '- hook (slide 1, type "start"): title ONLY — cover headline (4–6 short lines) with ==accent== on 1–2 words. imageBrief required. Do NOT populate body/subtitle on slide 1.',
    '- scene (middle slides): NO title field. Split copy across 2–3 SHORT blocks — never pack 3+ sentences into a single field.',
    '  Each block: 1–2 sentences (~120–220 chars). Use body + body2 + subtitle when the slide has room for three beats.',
    '  Highlights: at most ONE ==word or short phrase== per text block (max 3 words). Never wrap full sentences or clauses.',
    '  Good: "O modelo de ==desagregação== inverte a lógica do all-in-one."',
    '  Bad: "==O modelo de desagregação inverte a lógica do all-in-one==".',
    '  Prefer ==accent== only. Avoid **bold** unless a single keyword needs extra weight.',
    '  A) type "text": body + body2 + subtitle (three balanced blocks). No imageBrief.',
    '  B) type "text_image" + body + body2 + subtitle + imageBrief: proof or scene with image.',
    '  C) type "text_image" + body + body2 + callToAction + imageBrief: concept slide with accent card.',
    '- proof: type "text_image". body + body2 + subtitle + imageBrief. No title.',
    '- cta (last slide, type "text"): body + body2 + subtitle (short blocks) + callToAction (provocation for accent box). No title, no ctaKeyword.',
    'Layout variety: the design step will assign v1–v5 image layouts — always provide the text fields each layout needs.',
    'NEVER use listItems. NEVER set title on slides 2+.',
    'NEVER include hashtags (#word) or @handles in any field.',
  ].join('\n');

  const slideStructurePrompt =
    slidesCount === 1
      ? isContentMachine
        ? [
            'Single-slide carousel (exactly 1 slide):',
            '- slide 1 only: type "start", narrativeRole "hook".',
            '- title = cover headline with ==accent== on 1–2 words.',
            '- imageBrief = cover photo direction (required).',
          ].join('\n')
        : [
            'Single-slide carousel (exactly 1 slide):',
            '- slide 1 only: type "start", narrativeRole "hook".',
            '- title = headline (up to 12 words) with ==accent== on 1–2 words.',
            '- subtitle = supporting line (max 120 chars).',
            '- imageBrief = cover photo direction (required).',
            '- optional callToAction = short closing line.',
          ].join('\n')
      : isContentMachine
        ? contentMachineStructurePrompt
        : [
          'Slide structure by narrativeRole:',
          '- hook (slide 1, type "start"): title = headline (up to 12 words) with ==accent== on exactly 1–2 high-impact words that carry the tension (never wrap the full title). subtitle = supporting line (max 120 chars). imageBrief = cover photo direction (required).',
          '- scene (middle slides): alternate formats:',
          '  A) type "text_image": title (use ==accent== on key term) + body with **bold** on metrics + imageBrief + optional callToAction (short punch line, MUST differ from body).',
          '  B) type "text_image": title + listItems (use **bold** on key words) + imageBrief + callToAction.',
          '  C) type "text": title + subtitle + listItems + callToAction — NO imageBrief.',
          '  D) type "text_image" with imageBrief describing "3 miniaturas verticais..." when showing multiple examples.',
          '- proof: type "text_image". title + body OR listItems + imageBrief + callToAction (one sentence takeaway, not a copy of body).',
          '- framework (before CTA): type "text". title + listItems (3–4 concrete pillars) + callToAction (max 80 chars). No imageBrief.',
          '- cta (last slide, type "text"): ctaKeyword (1–2 words). body (lead, max 160 chars). ctaHint (support line). callToAction (clear action).',
        ].join('\n');

  const diversityPrompt =
    slidesCount <= 2 || isContentMachine
      ? isContentMachine && slidesCount > 2
        ? [
            'Diversity rules (Content Machine):',
            '- Middle slides must NOT include title.',
            '- Alternate text-only slides (type "text") with text_image slides.',
            '- Prefer 3 short text blocks (body, body2, subtitle) over one long body paragraph.',
            '- Use ==highlight== sparingly: max 1 per block, 1–3 words only — never whole sentences.',
            '- On text_image slides always provide body + body2 + subtitle OR body + body2 + callToAction.',
            '- Vary narrative density: some slides are text-heavy (no image), others sandwich image between text blocks.',
            '- callToAction on last slide must be a provocative question or insight for the accent box.',
          ].join('\n')
        : ''
      : [
          'Diversity rules:',
          `- Among ${Math.max(slidesCount - 2, 1)} middle slides, include at least one type "text" slide without imageBrief.`,
          '- At least one scene slide must use listItems instead of a long body paragraph.',
          '- Do not repeat the same field pattern (title + body + image) on more than two consecutive slides.',
          '- callToAction must never duplicate body text — use a shorter closing insight or question.',
          '- imageBrief must describe a concrete visual (object, setting, framing) — required whenever type is "start" or "text_image".',
          'Do NOT repeat "em algum lugar, em algum protótipo, em alguma startup" patterns in the closing.',
          'Narrative: one dramatic arc across the day or journey — each slide must connect to the next.',
        ].join('\n');

  const slideIds = Array.from({ length: slidesCount }, (_, index) => `slide_${index + 1}`);
  const exampleSlides = slideIds.map((id, index) => {
    const order = index + 1;
    if (index === 0) {
      return `{"id":"${id}","order":${order},"type":"start","narrativeRole":"hook","title":"...","imageBrief":"..."}`;
    }
    if (order === slidesCount) {
      return `{"id":"${id}","order":${order},"type":"text","narrativeRole":"cta","body":"...","callToAction":"..."}`;
    }
    return `{"id":"${id}","order":${order},"type":"text","narrativeRole":"scene","body":"..."}`;
  });

  // On a retry the previous attempt was rejected — most commonly for returning
  // the wrong number of slides. Tell the model explicitly so it corrects course
  // instead of repeating the same mistake against an identical prompt.
  const correctiveNote =
    retry && retry.attempt > 1 && retry.previousError
      ? [
          `CORRECTION — your previous attempt was rejected: ${retry.previousError}.`,
          slidesCount > 1
            ? `You MUST return EXACTLY ${slidesCount} slide objects in the "slides" array — never collapse them into a single slide. Do not merge, summarize, or omit slides.`
            : '',
          'Return only the corrected JSON.',
        ]
          .filter(Boolean)
          .join(' ')
      : '';

  return [
    correctiveNote,
    ideaContext,
    `Brand voice context: ${brand.brandName} (${brand.instagramHandle}).`,
    instructions ? `Template rules (follow narrative roles):\n${instructions.slice(0, 2500)}` : '',
    `Generate copy for exactly ${slidesCount} slide${slidesCount === 1 ? '' : 's'}.`,
    'Each slide MUST include narrativeRole and every text field that will appear on the final slide.',
    slidesCount > 1
      ? isContentMachine
        ? 'Vary slide shapes — alternate text narrative (no title) with text_image slides.'
        : 'Vary slide shapes across the carousel — do NOT make every middle slide identical (title + short body + image).'
      : 'Pack the full message into this single cover slide.',
    '',
    slideStructurePrompt,
    '',
    diversityPrompt,
    'Plain text only.',
    slidesCount > 1
      ? `The "slides" array MUST contain exactly ${slidesCount} objects, one per slide, with ids ${slideIds.join(', ')} and sequential "order" from 1 to ${slidesCount}. Returning fewer than ${slidesCount} slides is invalid and will be rejected — never collapse the carousel into a single slide.`
      : '',
    `Return JSON shaped exactly like this (${slidesCount} slide${slidesCount === 1 ? '' : 's'}, fill every field): {"slides":[${exampleSlides.join(',')}]}`,
  ]
    .filter(Boolean)
    .join('\n');
};
