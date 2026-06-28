import { createLlmCallStep } from '@company-os/agent-ia-sdk/agents';
import { z } from 'zod';
import { buildIdeasSystemPrompt, buildIdeasUserPrompt } from '../prompts/ideas.prompts';

const ideasLlmOutputZod = z.object({
  ideas: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  ),
});

export const createGenerateIdeasStep = () =>
  createLlmCallStep({
    outputSchema: ideasLlmOutputZod,
    buildSystem: buildIdeasSystemPrompt,
    buildUser: buildIdeasUserPrompt,
    transformOutput: (data) => ({ ideas: data.ideas }),
  });
