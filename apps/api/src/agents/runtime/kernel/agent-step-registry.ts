import { buildAgentStepExecutors } from '../../adapters/build-agent-step-executors';
import { cutsAgent } from '../../cuts/agent';
import type { CustomStepExecutor } from './agent-execution.kernel';

/**
 * Registry de executores de step customizados, indexado por `agentId:stepKey`.
 *
 * `cuts` é o único agente concreto criado. Ver `docs/agents/agent-sdk.md`.
 */
export const agentStepRegistry: Record<string, CustomStepExecutor> = {
  ...buildAgentStepExecutors(cutsAgent),
};
