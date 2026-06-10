import {
  AgentBuilder,
  createImageGenerationStep,
  createLlmCallStep,
  createRetrieveContextStep,
  createValidationStep,
} from '@company-os/agent-sdk';
import { mapToKernelAgentDefinition } from '../adapters/to-kernel-definition';
import type { BrandProfile } from '@company-os/agent-sdk';
import { buildDesignerSystemPrompt, buildDesignerUserPrompt } from './prompts/image.system';
import {
  designerInputZod,
  designerOutputZod,
  imagePromptZod,
} from './schemas/output.schema';

export const designerAgent = AgentBuilder.create({ id: 'designer', version: '1.0.0' })
  .label('Gerar imagem')
  .description('Cria imagens para seus posts usando IA')
  .input(designerInputZod)
  .output(designerOutputZod)
  .capabilities(['text', 'image'])
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
  .addStep('generate_prompt', {
    label: 'Gerar prompt',
    type: 'llm_call',
    config: { maxTokens: 512, temperature: 0.7 },
    run: createLlmCallStep({
      outputSchema: imagePromptZod,
      maxTokens: 512,
      temperature: 0.7,
      buildSystem: (context) =>
        buildDesignerSystemPrompt(context.brandProfile as BrandProfile | null, context.contextPack),
      buildUser: (context) =>
        buildDesignerUserPrompt(
          String((context.inputPayload as { userInput?: string }).userInput ?? ''),
        ),
    }),
  })
  .addStep('generate_image', {
    label: 'Gerar imagem',
    type: 'image_generation',
    run: createImageGenerationStep({ promptStepKey: 'generate_prompt' }),
  })
  .addStep('validate_output', {
    label: 'Validar saída',
    type: 'validation',
    run: createValidationStep({
      schema: designerOutputZod,
      sourceStepKeys: ['generate_image'],
    }),
  })
  .build();

export const designerAgentDefinition = mapToKernelAgentDefinition(designerAgent.definition);
