import type { AgentDefinition } from '../runtime/kernel/types';
import { strategistOutputSchema } from './schemas/output.schema';

export const strategistAgentDefinition: AgentDefinition = {
  agentId: 'strategist',
  label: 'Planejar conteúdo',
  description: 'Cria um plano de conteúdo estratégico para sua marca',
  inputSchema: {
    type: 'object',
    properties: {
      userInput: {
        type: 'string',
        description: 'Briefing para o planejamento (ex: "Plano semanal para lançamento de produto")',
        minLength: 5,
        maxLength: 2000,
      },
    },
    required: ['userInput'],
  },
  outputSchema: strategistOutputSchema,
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
      key: 'generate_plan',
      label: 'Gerar plano',
      type: 'llm_call',
      config: {
        maxTokens: 2048,
        temperature: 0.7,
      },
    },
    {
      key: 'validate_output',
      label: 'Validar saída',
      type: 'validation',
      config: {
        schema: 'strategistOutputSchema',
        strictValidation: true,
      },
    },
  ],
  capabilities: ['text', 'structured_output'],
};

export default strategistAgentDefinition;
