import type { CreateStepContextParams } from '../core/agent-runtime-types';
import type { StepExecutionContext } from '../core/types';

export const buildStepContext = async (
  params: CreateStepContextParams,
): Promise<StepExecutionContext> => {
  return {
    runId: params.runId,
    agentId: params.agentId,
    companyId: params.companyId,
    stepKey: params.stepKey,
    stepIndex: params.stepIndex,
    inputPayload: params.inputPayload,
    previousStepsOutput: params.previousStepsOutput,
  };
};
