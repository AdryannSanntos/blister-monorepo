import { buildAgentStepExecutors } from '../../adapters/build-agent-step-executors';
import { carouselAgent } from '../../carousel/agent';
import { cutsAgent } from '../../cuts/agent';
import type { CustomStepExecutor } from './agent-execution.kernel';

/**
 * Registry de executores de step customizados, indexado por `agentId:stepKey`.
 *
 * Keep in sync with `buildRegisteredAgents()` in `agent-catalog.ts`.
 */
export const agentStepRegistry: Record<string, CustomStepExecutor> = {
  ...buildAgentStepExecutors(cutsAgent),
  ...buildAgentStepExecutors(carouselAgent),
};
