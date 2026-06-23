import type { AgentDefinitionRuntime, AgentStepDefinitionRuntime } from './agent-runtime-types';
import type { AnyStepExecutor, BuiltAgent } from './types';

const RUNTIME_STEP_TYPES = new Set<AgentStepDefinitionRuntime['type']>([
  'preparation',
  'clarification',
  'llm_call',
  'validation',
  'output',
  'image_generation',
]);

const toRuntimeStepType = (
  type: BuiltAgent['definition']['steps'][number]['type'],
): AgentStepDefinitionRuntime['type'] => {
  if (type === 'form' || type === 'decision') return 'clarification';
  return RUNTIME_STEP_TYPES.has(type as AgentStepDefinitionRuntime['type'])
    ? (type as AgentStepDefinitionRuntime['type'])
    : 'preparation';
};

/** Maps a built agent into the runtime definition consumed by `executeRun`. */
export const toRuntimeDefinition = (agent: BuiltAgent): AgentDefinitionRuntime => ({
  agentId: agent.definition.agentId,
  version: agent.definition.version,
  label: agent.definition.label,
  description: agent.definition.description ?? '',
  inputSchema: agent.definition.inputSchema,
  outputSchema: agent.definition.outputSchema,
  steps: agent.definition.steps.map((step) => ({
    key: step.key,
    label: step.label,
    type: toRuntimeStepType(step.type),
    config: step.config,
  })),
  capabilities: agent.definition.capabilities,
  skills: agent.definition.skills,
  middleware: agent.middleware,
  routing: agent.routing,
});

/** Builds the `agentId:stepKey` executor map from one or more built agents. */
export const toStepExecutors = (agents: BuiltAgent[]): Record<string, AnyStepExecutor> => {
  const executors: Record<string, AnyStepExecutor> = {};
  for (const agent of agents) {
    for (const [stepKey, executor] of Object.entries(agent.steps)) {
      executors[`${agent.definition.agentId}:${stepKey}`] = executor;
    }
  }
  return executors;
};

/** Global registry of built agents, keyed by `agentId@version`. */
export class AgentRegistry {
  private static agents = new Map<string, BuiltAgent>();

  static register(agent: BuiltAgent): void {
    AgentRegistry.agents.set(agent.definition.agentId, agent);
  }

  static get(agentId: string): BuiltAgent | undefined {
    return AgentRegistry.agents.get(agentId);
  }

  static getRuntimeDefinition(agentId: string): AgentDefinitionRuntime | null {
    const agent = AgentRegistry.agents.get(agentId);
    return agent ? toRuntimeDefinition(agent) : null;
  }

  static list(): BuiltAgent[] {
    return [...AgentRegistry.agents.values()];
  }

  static clear(): void {
    AgentRegistry.agents.clear();
  }
}
