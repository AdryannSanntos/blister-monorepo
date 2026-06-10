import type { PrismaClient } from '../../../generated/prisma';
import { copywriterAgentDefinition } from '../../copywriter/agent';
import { designerAgentDefinition } from '../../designer/agent';
import { postAgentDefinition } from '../../post/agent';
import { strategistAgentDefinition } from '../../strategist/agent';
import type { AgentDefinition } from './types';

const defaultAgentDefinitions: Record<string, AgentDefinition> = {
  copywriter: copywriterAgentDefinition,
  strategist: strategistAgentDefinition,
  designer: designerAgentDefinition,
  post: postAgentDefinition,
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
