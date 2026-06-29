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
  const isContentMachine = templateId === 'content-machine';

  const contentMachineStructurePrompt = [
    'Slide structure for Content Machine template:',
    '- hook (slide 1, type "start"): title ONLY — cover headline (4–6 short lines) with ==accent== on 1–2 words. imageBrief required. Do NOT populate body/subtitle on slide 1.',
    '- scene (middle slides): NO title field. Split copy across 2–3 SHORT blocks — never pack 3+ sentences into a single field.',
    '  Each block: 1–2 sentences (~80–160 chars). Use body + body2 + subtitle when the slide has room for three beats.',
    '  REQUIRED highlights: at least one ==word or short phrase== per text block. At least 60% of internal slides must use highlights.',
    '  Mix typography in copy: use **phrase** for sans emphasis inside serif blocks (and vice versa where natural).',
    '  A) type "text": body + body2 + subtitle (three balanced blocks). No imageBrief.',
    '  B) type "text_image" + body + body2 + subtitle + imageBrief: proof or scene with image.',
    '  C) type "text_image" + body + body2 + callToAction + imageBrief: concept slide with accent card.',
    '- proof: type "text_image". body + body2 + subtitle + imageBrief. No title.',
    '- cta (last slide, type "text"): body + body2 + subtitle (short blocks) + callToAction (provocation for accent box). No title, no ctaKeyword.',
    'Layout variety: the design step will assign v1–v5 image layouts — always provide the text fields each layout needs.',
    'NEVER use listItems. NEVER set title on slides 2+.',
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
            '- Every text block should include at least one ==highlight== when possible.',
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

  return [
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
    'Return JSON: {"slides":[{"id":"slide_1","order":1,"type":"start","narrativeRole":"hook","title":"...","subtitle":"...","imageBrief":"..."}]}',
  ]
    .filter(Boolean)
    .join('\n');
};
