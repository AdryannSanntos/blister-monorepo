import type { BuiltAgent } from '@company-os/agent-sdk';
import type { CustomStepExecutor } from '../runtime/kernel/agent-execution.kernel';
import { wrapSdkStep } from './sdk-step.adapter';

export const buildAgentStepExecutors = (agent: BuiltAgent): Record<string, CustomStepExecutor> => {
  const executors: Record<string, CustomStepExecutor> = {};

  for (const [stepKey, stepExecutor] of Object.entries(agent.steps)) {
    executors[`${agent.definition.agentId}:${stepKey}`] = wrapSdkStep(stepExecutor);
  }

  return executors;
};
