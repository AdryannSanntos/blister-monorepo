import type { PrismaClient } from '../../../generated/prisma';
import type { AgentDefinition } from './types';
import { copywriterAgentDefinition } from '../../copywriter/agent.definition';
import { strategistAgentDefinition } from '../../strategist/agent.definition';
import { designerAgentDefinition } from '../../designer/agent.definition';

const defaultAgentDefinitions: Record<string, AgentDefinition> = {
  copywriter: copywriterAgentDefinition,
  strategist: strategistAgentDefinition,
  designer: designerAgentDefinition,
  post: {
    agentId: 'post',
    label: 'Criar post completo',
    description: 'Cria um post completo com texto e imagem',
    inputSchema: {
      type: 'object',
      properties: {
        userInput: { type: 'string', description: 'Briefing para o post' },
      },
      required: ['userInput'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        imageUrl: { type: 'string' },
        storageKey: { type: 'string' },
        tone: { type: 'string' },
        reviewStatus: { type: 'string' },
      },
      required: ['caption', 'hashtags', 'imageUrl', 'reviewStatus'],
    },
    steps: [
      { key: 'retrieve_context', label: 'Buscar contexto', type: 'preparation' },
      { key: 'generate_caption', label: 'Gerar legenda', type: 'llm_call' },
      { key: 'generate_prompt', label: 'Gerar prompt de imagem', type: 'llm_call' },
      { key: 'generate_image', label: 'Gerar imagem', type: 'image_generation' },
      { key: 'validate_output', label: 'Validar saída', type: 'validation' },
    ],
    capabilities: ['text', 'image', 'structured_output'],
  },
};

export async function loadAgentDefinition(
  prisma: PrismaClient,
  agentId: string,
): Promise<AgentDefinition | null> {
  const config = await prisma.pipelineAgentConfig.findUnique({
    where: { agentId },
  });

  if (!config?.isEnabled) {
    return null;
  }

  return defaultAgentDefinitions[agentId] ?? null;
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return Object.values(defaultAgentDefinitions);
}

export function getAgentDefinitionSync(agentId: string): AgentDefinition | null {
  return defaultAgentDefinitions[agentId] ?? null;
}

export function registerAgentDefinition(definition: AgentDefinition): void {
  defaultAgentDefinitions[definition.agentId] = definition;
}
