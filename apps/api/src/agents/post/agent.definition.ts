import type { AgentDefinition } from '../runtime/kernel/types';
import { postOutputSchema } from './schemas/output.schema';
import { POST_AGENT_SKILL_IDS } from './skills';

export const postAgentDefinition: AgentDefinition = {
  agentId: 'post',
  label: 'Criar post',
  description: 'Cria posts para redes sociais em HTML+CSS usando a identidade da marca',
  inputSchema: {
    type: 'object',
    properties: {
      userInput: {
        type: 'string',
        description:
          'Conteúdo do post (ex: "Post sobre lançamento do bolo de cenoura com promoção")',
        minLength: 5,
        maxLength: 1000,
      },
    },
    required: ['userInput'],
  },
  outputSchema: postOutputSchema,
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
      key: 'collect_brief',
      label: 'Entender o pedido',
      type: 'clarification',
    },
    {
      key: 'plan_design',
      label: 'Planejar o design',
      type: 'llm_call',
      config: {
        maxTokens: 4096,
        temperature: 0.35,
      },
    },
    {
      key: 'generate_post',
      label: 'Montar o post',
      type: 'llm_call',
      config: {
        maxTokens: 16384,
        temperature: 0.55,
      },
    },
    {
      key: 'validate_output',
      label: 'Validar saída',
      type: 'validation',
      config: {
        schema: 'postOutputSchema',
        strictValidation: true,
      },
    },
  ],
  capabilities: ['text', 'html', 'structured_output'],
  skills: [...POST_AGENT_SKILL_IDS],
};

export default postAgentDefinition;
