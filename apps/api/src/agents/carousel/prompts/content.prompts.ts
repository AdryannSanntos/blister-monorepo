import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';

export const buildContentSystemPrompt = (_context: StepExecutionContext): string =>
  'You are a copywriter specializing in social media carousel content. ' +
  'Generate concise, engaging slide content for each slide in the carousel. ' +
  'Each slide needs an id, order, type (start|text|text_image|image), optional title, optional body, optional callToAction. ' +
  'Keep text brief and impactful. First slide is always type "start". Last slide has a call to action. ' +
  'Return only valid JSON matching the schema provided.';

export const buildContentUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as {
    theme?: string;
    slidesCount?: number;
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
  const ideas =
    awaitsOutput?.ideas ?? ideasOutput?.ideas ?? [];
  const selectedIdea = ideas.find((idea) => idea.id === selectedId);

  const ideaContext = selectedIdea
    ? `Selected idea: "${selectedIdea.title}" — ${selectedIdea.description}`
    : `Theme: ${input.theme ?? 'general'}`;

  const slidesCount = input.slidesCount ?? 5;

  return [
    ideaContext,
    `Generate content for exactly ${slidesCount} slides.`,
    'Slide types: first slide = "start", middle slides = "text" or "text_image", last slide = "text" with callToAction.',
    'Keep titles under 8 words. Keep body under 30 words per slide.',
    'Return JSON: {"slides": [{"id":"slide_1","order":1,"type":"start","title":"...","body":"...","callToAction":"..."}]}',
  ].join('\n');
};
