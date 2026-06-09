import { postStepExecutors } from '../../post';
import type { CustomStepExecutor } from './agent-execution.kernel';

/**
 * Registry of agent-specific step executors, keyed by `"<agentId>:<stepKey>"`.
 * The kernel consults this map before falling back to the generic per-type
 * step handler, letting an agent fully own a step's behavior (custom prompts,
 * pausing for input, output shaping). Agents that register nothing keep the
 * generic behavior unchanged.
 *
 * Mirrors the `agent-loader` pattern: each agent contributes its executors and
 * this central file aggregates them.
 */
export const customStepExecutors: Record<string, CustomStepExecutor> = {
  ...postStepExecutors,
};
