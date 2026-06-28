import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';

export const buildIdeasSystemPrompt = (_context: StepExecutionContext): string =>
  'You are a social media content strategist specializing in carousel posts. ' +
  'Generate creative, engaging carousel ideas in JSON format. ' +
  'Each idea must have an id, title, and description. ' +
  'Return only valid JSON matching the schema provided.';

export const buildIdeasUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as {
    theme?: string;
    slidesCount?: number;
    socialNetworks?: string[];
  };
  const theme = input.theme ?? 'general';
  const slidesCount = input.slidesCount ?? 5;
  const networks = (input.socialNetworks ?? ['instagram']).join(', ');

  return [
    `Generate 5 carousel post ideas for the theme: "${theme}".`,
    `Target: ${slidesCount} slides per carousel on ${networks}.`,
    'Make ideas varied in angle (educational, inspirational, list, storytelling, how-to).',
    'Return JSON: {"ideas": [{"id":"idea_1","title":"...","description":"..."}]}',
  ].join('\n');
};
