import { initialMessagesAgent } from './initial-messages.agent';
import type { AnySystemAgentDefinition } from './system-agent.types';
import { threadTitleAgent } from './thread-title.agent';

/**
 * Registry dos agentes de sistema. Cada entrada vem de um arquivo
 * `*.agent.ts` próprio. Para adicionar um novo agente de sistema, crie o
 * arquivo da definição e registre-o aqui.
 */
export const SYSTEM_AGENTS = [threadTitleAgent, initialMessagesAgent] as const;

const REGISTRY = new Map<string, AnySystemAgentDefinition>(
  SYSTEM_AGENTS.map((agent) => [agent.key, agent as unknown as AnySystemAgentDefinition]),
);

export const listSystemAgents = (): AnySystemAgentDefinition[] => Array.from(REGISTRY.values());

export const getSystemAgent = (key: string): AnySystemAgentDefinition | null =>
  REGISTRY.get(key) ?? null;

export { threadTitleAgent } from './thread-title.agent';
export { initialMessagesAgent } from './initial-messages.agent';
export * from './system-agent.types';
