import type { AgentDefinition } from '../runtime/kernel/types';
import { copywriterOutputSchema } from './schemas/output.schema';

export const copywriterAgentDefinition: AgentDefinition = {
  agentId: 'copywriter',
  label: 'Criar texto',
  description: 'Cria legendas e textos de marketing para suas redes sociais',
  inputSchema: {
    type: 'object',
    properties: {
      userInput: {
        type: 'string',
        description: 'Briefing para o texto (ex: "Post sobre lançamento de bolo de cenoura")',
        minLength: 5,
        maxLength: 1000,
      },
    },
    required: ['userInput'],
  },
  outputSchema: copywriterOutputSchema,
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
      key: 'generate_caption',
      label: 'Gerar legenda',
      type: 'llm_call',
      config: {
        maxTokens: 1024,
        temperature: 0.8,
      },
    },
    {
      key: 'validate_output',
      label: 'Validar saída',
      type: 'validation',
      config: {
        schema: 'copywriterOutputSchema',
        strictValidation: true,
      },
    },
  ],
  capabilities: ['text', 'structured_output'],
};

export default copywriterAgentDefinition;
