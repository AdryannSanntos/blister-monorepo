import { buildAgentStepExecutors } from '../../adapters/build-agent-step-executors';
import { copywriterAgent } from '../../copywriter/agent';
import { designerAgent } from '../../designer/agent';
import { postAgent } from '../../post/agent';
import { strategistAgent } from '../../strategist/agent';
import type { CustomStepExecutor } from './agent-execution.kernel';

export const agentStepRegistry: Record<string, CustomStepExecutor> = {
  ...buildAgentStepExecutors(copywriterAgent),
  ...buildAgentStepExecutors(strategistAgent),
  ...buildAgentStepExecutors(designerAgent),
  ...buildAgentStepExecutors(postAgent),
};
