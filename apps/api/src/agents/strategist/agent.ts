import {
  AgentBuilder,
  createLlmCallStep,
  createRetrieveContextStep,
  createValidationStep,
} from '@company-os/agent-sdk';
import { mapToKernelAgentDefinition } from '../adapters/to-kernel-definition';
import type { BrandProfile } from '@company-os/agent-sdk';
import { buildStrategistSystemPrompt, buildStrategistUserPrompt } from './prompts/plan.system';
import {
  strategistInputZod,
  strategistLlmOutputZod,
  strategistOutputZod,
} from './schemas/output.schema';

export const strategistAgent = AgentBuilder.create({ id: 'strategist', version: '1.0.0' })
  .label('Planejar conteúdo')
  .description('Cria um plano de conteúdo estratégico para sua marca')
  .input(strategistInputZod)
  .output(strategistOutputZod)
  .capabilities(['strategy', 'planning', 'structured_output'])
  .withContext({
    includeBrandBrain: true,
    includeAgentLearning: true,
    includeCampaignContext: true,
  })
  .addStep('retrieve_context', {
    label: 'Buscar contexto',
    type: 'preparation',
    run: createRetrieveContextStep(),
  })
  .addStep('generate_plan', {
    label: 'Gerar plano',
    type: 'llm_call',
    config: { maxTokens: 2048, temperature: 0.7 },
    run: createLlmCallStep({
      outputSchema: strategistLlmOutputZod,
      maxTokens: 2048,
      temperature: 0.7,
      buildSystem: (context) =>
        buildStrategistSystemPrompt(
          context.brandProfile as BrandProfile | null,
          context.contextPack,
        ),
      buildUser: (context) =>
        buildStrategistUserPrompt(
          String((context.inputPayload as { userInput?: string }).userInput ?? ''),
        ),
    }),
  })
  .addStep('validate_output', {
    label: 'Validar saída',
    type: 'validation',
    run: createValidationStep({
      schema: strategistOutputZod,
      sourceStepKeys: ['generate_plan'],
    }),
  })
  .build();

export const strategistAgentDefinition = mapToKernelAgentDefinition(strategistAgent.definition);
