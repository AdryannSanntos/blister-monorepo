import type { ContextPackBuilder, CreateStepContextParams } from '../core/agent-runtime-types';
import type { ContextPack, StepExecutionContext } from '../core/types';

export const buildStepContext = async (
  params: CreateStepContextParams,
): Promise<StepExecutionContext> => {
  const contextPack = await buildContextPack(params.contextPackBuilder, params);

  return {
    runId: params.runId,
    agentId: params.agentId,
    companyId: params.companyId,
    campaignId: params.campaignId,
    stepKey: params.stepKey,
    stepIndex: params.stepIndex,
    inputPayload: params.inputPayload,
    previousStepsOutput: params.previousStepsOutput,
    contextPack,
    brandProfile: params.brandProfile,
  };
};

const buildContextPack = async (
  contextPackBuilder: ContextPackBuilder | null,
  params: CreateStepContextParams,
): Promise<ContextPack> => {
  const rawInput = (params.inputPayload as { userInput?: unknown }).userInput;
  const userInput = typeof rawInput === 'string' ? rawInput.trim() : '';

  if (!userInput || !contextPackBuilder) {
    return { chunks: [], totalFound: 0 };
  }

  return contextPackBuilder.buildPack({
    companyId: params.companyId,
    query: userInput,
    agentId: params.agentId,
    campaignId: params.campaignId ?? undefined,
    includeBrandBrain: true,
    includeAgentLearning: true,
    includeCampaignContext: Boolean(params.campaignId),
  });
};
