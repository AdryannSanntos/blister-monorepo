import type { PrismaClient } from '../../../generated/prisma';
import type { AgentDefinition, StepDefinition } from './types';

const defaultAgentDefinitions: Record<string, AgentDefinition> = {
  strategist: {
    agentId: 'strategist',
    label: 'Planejar conteúdo',
    description: 'Cria um plano de conteúdo estratégico para sua marca',
    inputSchema: {
      type: 'object',
      properties: {
        userInput: { type: 'string', description: 'Briefing para o planejamento' },
      },
      required: ['userInput'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        topics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              suggestedDate: { type: 'string' },
            },
          },
        },
        calendar: {
          type: 'object',
          properties: {
            weeklyPosts: { type: 'number' },
            bestTimes: { type: 'array', items: { type: 'string' } },
          },
        },
        recommendations: { type: 'string' },
        reviewStatus: { type: 'string' },
      },
      required: ['topics', 'recommendations', 'reviewStatus'],
    },
    steps: [
      { key: 'retrieve_context', label: 'Buscar contexto', type: 'preparation' },
      { key: 'generate_plan', label: 'Gerar plano', type: 'llm_call' },
      { key: 'validate_output', label: 'Validar saída', type: 'validation' },
    ],
    capabilities: ['text', 'structured_output'],
  },
  copywriter: {
    agentId: 'copywriter',
    label: 'Criar texto',
    description: 'Cria legendas e textos de marketing para suas redes sociais',
    inputSchema: {
      type: 'object',
      properties: {
        userInput: { type: 'string', description: 'Briefing para o texto' },
      },
      required: ['userInput'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string' },
        reviewStatus: { type: 'string' },
      },
      required: ['caption', 'hashtags', 'reviewStatus'],
    },
    steps: [
      { key: 'retrieve_context', label: 'Buscar contexto', type: 'preparation' },
      { key: 'generate_caption', label: 'Gerar legenda', type: 'llm_call' },
      { key: 'validate_output', label: 'Validar saída', type: 'validation' },
    ],
    capabilities: ['text', 'structured_output'],
  },
  designer: {
    agentId: 'designer',
    label: 'Gerar imagem',
    description: 'Cria imagens para seus posts usando IA',
    inputSchema: {
      type: 'object',
      properties: {
        userInput: { type: 'string', description: 'Briefing para a imagem' },
      },
      required: ['userInput'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string' },
        storageKey: { type: 'string' },
        prompt: { type: 'string' },
        style: { type: 'string' },
        reviewStatus: { type: 'string' },
      },
      required: ['imageUrl', 'prompt', 'reviewStatus'],
    },
    steps: [
      { key: 'retrieve_context', label: 'Buscar contexto', type: 'preparation' },
      { key: 'generate_prompt', label: 'Gerar prompt', type: 'llm_call' },
      { key: 'generate_image', label: 'Gerar imagem', type: 'image_generation' },
      { key: 'validate_output', label: 'Validar saída', type: 'validation' },
    ],
    capabilities: ['text', 'image'],
  },
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
