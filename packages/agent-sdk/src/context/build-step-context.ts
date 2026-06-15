import type { ContextPackBuilder, CreateStepContextParams } from '../core/agent-runtime-types';
import type { AgentContextConfig, ContextPack, StepExecutionContext } from '../core/types';

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
  const config = resolveContextConfig(params.contextConfig);
  const rawInput = (params.inputPayload as { userInput?: unknown }).userInput;
  const userInput = typeof rawInput === 'string' ? rawInput.trim() : '';

  const shouldRetrieve =
    Boolean(userInput) &&
    Boolean(contextPackBuilder) &&
    config.useUserInputAsRetrievalQuery &&
    (config.includeBrandBrain ||
      config.includeAgentLearning ||
      (config.includeCampaignContext && Boolean(params.campaignId)));

  if (!shouldRetrieve) {
    return { chunks: [], totalFound: 0 };
  }

  try {
    return await contextPackBuilder!.buildPack({
      companyId: params.companyId,
      query: userInput,
      agentId: params.agentId,
      campaignId: params.campaignId ?? undefined,
      includeBrandBrain: config.includeBrandBrain,
      includeAgentLearning: config.includeAgentLearning,
      includeCampaignContext: config.includeCampaignContext && Boolean(params.campaignId),
    });
  } catch {
    // RAG/embeddings are best-effort — a provider outage must not fail the whole run.
    return { chunks: [], totalFound: 0 };
  }
};

const resolveContextConfig = (config?: AgentContextConfig): Required<
  Pick<AgentContextConfig, 'includeBrandBrain' | 'includeAgentLearning' | 'includeCampaignContext'>
> &
  Pick<AgentContextConfig, 'useUserInputAsRetrievalQuery'> => ({
  includeBrandBrain: config?.includeBrandBrain ?? true,
  includeAgentLearning: config?.includeAgentLearning ?? true,
  includeCampaignContext: config?.includeCampaignContext ?? true,
  useUserInputAsRetrievalQuery: config?.useUserInputAsRetrievalQuery ?? true,
});
