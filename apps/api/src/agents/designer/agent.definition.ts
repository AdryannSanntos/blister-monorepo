import type { AgentDefinition } from '../runtime/kernel/types';
import { designerOutputSchema } from './schemas/output.schema';

export const designerAgentDefinition: AgentDefinition = {
  agentId: 'designer',
  label: 'Gerar imagem',
  description: 'Cria imagens para seus posts usando IA',
  inputSchema: {
    type: 'object',
    properties: {
      userInput: {
        type: 'string',
        description: 'Briefing para a imagem (ex: "Imagem para post de lançamento de bolo de cenoura")',
        minLength: 5,
        maxLength: 1000,
      },
    },
    required: ['userInput'],
  },
  outputSchema: designerOutputSchema,
  steps: [
    {
      key: 'retrieve_context',
      label: 'Buscar contexto',
      type: 'preparation',
      config: {
        includeBrandBrain: true,
        includeAgentLearning: true,
        includeCampaignContext: true,
      },
    },
    {
      key: 'generate_prompt',
      label: 'Gerar prompt',
      type: 'llm_call',
      config: {
        maxTokens: 512,
        temperature: 0.7,
      },
    },
    {
      key: 'generate_image',
      label: 'Gerar imagem',
      type: 'image_generation',
      config: {
        model: 'gemini-2.5-flash-image',
        provider: 'gemini',
      },
    },
    {
      key: 'validate_output',
      label: 'Validar saída',
      type: 'validation',
      config: {
        schema: 'designerOutputSchema',
        strictValidation: true,
      },
    },
  ],
  capabilities: ['text', 'image'],
};

export default designerAgentDefinition;
