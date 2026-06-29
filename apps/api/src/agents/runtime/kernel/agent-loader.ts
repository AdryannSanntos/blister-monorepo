import type { AgentDefinitionRuntime } from '@company-os/agent-ia-sdk/agents';
import type { PrismaClient } from '@company-os/db';
import { mapToKernelAgentDefinition } from '../../adapters/to-kernel-definition';
import { carouselAgent } from '../../carousel/agent';
import { cutsAgent } from '../../cuts/agent';
import type { AgentDefinition } from './types';

const builtInAgents = [cutsAgent, carouselAgent] as const;

const defaultAgentDefinitions: Record<string, AgentDefinitionRuntime> = Object.fromEntries(
  builtInAgents.map((agent) => [
    agent.definition.agentId,
    {
      ...mapToKernelAgentDefinition(agent.definition),
      routing: agent.routing,
    },
  ]),
);

/**
 * Agent definitions loaded by the execution kernel (API + Trigger workers).
 *
 * Keep in sync with `buildRegisteredAgents()` in `agent-catalog.ts`.
 */
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
