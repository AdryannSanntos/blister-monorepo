import {
  AgentBuilder,
  createLlmCallStep,
  createRetrieveContextStep,
  createValidationStep,
} from '@company-os/agent-sdk';
import { mapToKernelAgentDefinition } from '../adapters/to-kernel-definition';
import type { BrandProfile } from '@company-os/agent-sdk';
import {
  extractLearningInsights,
  serializeCopywriterLearning,
} from './learning/feedback-handler';
import { buildCopywriterSystemPrompt, buildCopywriterUserPrompt } from './prompts/caption.system';
import {
  copywriterInputZod,
  copywriterLlmOutputZod,
  copywriterOutputZod,
} from './schemas/output.schema';

export const copywriterAgent = AgentBuilder.create({ id: 'copywriter', version: '1.0.0' })
  .label('Criar texto')
  .description('Cria legendas e textos de marketing para suas redes sociais')
  .input(copywriterInputZod)
  .output(copywriterOutputZod)
  .capabilities(['text', 'structured_output'])
  .withContext({
    includeBrandBrain: true,
    includeAgentLearning: true,
    includeCampaignContext: true,
  })
  .withLearning({
    serialize: serializeCopywriterLearning,
    extractInsights: extractLearningInsights,
  })
  .addStep('retrieve_context', {
    label: 'Buscar contexto',
    type: 'preparation',
    run: createRetrieveContextStep(),
  })
  .addStep('generate_caption', {
    label: 'Gerar legenda',
    type: 'llm_call',
    config: { maxTokens: 1024, temperature: 0.8 },
    run: createLlmCallStep({
      outputSchema: copywriterLlmOutputZod,
      maxTokens: 1024,
      temperature: 0.8,
      buildSystem: (context) =>
        buildCopywriterSystemPrompt(
          context.brandProfile as BrandProfile | null,
          context.contextPack,
        ),
      buildUser: (context) =>
        buildCopywriterUserPrompt(
          String((context.inputPayload as { userInput?: string }).userInput ?? ''),
        ),
      transformOutput: (data) => ({
        ...data,
        hashtags: data.hashtags.map((tag: string) => (tag.startsWith('#') ? tag : `#${tag}`)),
      }),
    }),
  })
  .addStep('validate_output', {
    label: 'Validar saída',
    type: 'validation',
    run: createValidationStep({
      schema: copywriterOutputZod,
      sourceStepKeys: ['generate_caption'],
    }),
  })
  .build();

export const copywriterAgentDefinition = mapToKernelAgentDefinition(copywriterAgent.definition);
