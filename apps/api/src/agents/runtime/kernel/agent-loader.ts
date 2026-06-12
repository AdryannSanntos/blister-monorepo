import type { PrismaClient } from '../../../generated/prisma';
import { mapToKernelAgentDefinition } from '../../adapters/to-kernel-definition';
import { cutsAgentDefinition } from '../../cuts/agent';
import type { AgentDefinition } from './types';

/**
 * Definições de agentes carregadas pelo kernel.
 *
 * `cuts` é o único agente concreto criado. Novos agentes devem ser registrados
 * aqui (ou via `registerAgentDefinition`). Ver `docs/agents/agent-sdk.md`.
 */
const defaultAgentDefinitions: Record<string, AgentDefinition> = {
  cuts: mapToKernelAgentDefinition(cutsAgentDefinition),
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
