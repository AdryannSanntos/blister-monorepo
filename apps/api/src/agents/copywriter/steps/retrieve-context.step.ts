import type { StepExecutionContext, StepResult } from '../../runtime/kernel/types';

export async function executeRetrieveContextStep(
  context: StepExecutionContext,
): Promise<StepResult> {
  const { contextPack, brandProfile } = context;

  const brandChunks = contextPack.chunks.filter((c) => c.sourceType === 'BRAND_BRAIN');
  const learningChunks = contextPack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
  const campaignChunks = contextPack.chunks.filter((c) =>
    ['CAMPAIGN', 'CAMPAIGN_FILE'].includes(c.sourceType),
  );

  const hasBrandContext = brandChunks.length > 0 || brandProfile !== null;
  const hasLearningContext = learningChunks.length > 0;
  const hasCampaignContext = campaignChunks.length > 0;

  return {
    type: 'CONTINUE',
    output: {
      contextRetrieved: true,
      totalChunks: contextPack.chunks.length,
      brandChunksCount: brandChunks.length,
      learningChunksCount: learningChunks.length,
      campaignChunksCount: campaignChunks.length,
      hasBrandContext,
      hasLearningContext,
      hasCampaignContext,
      brandProfileAvailable: brandProfile !== null,
      topLearningScores: learningChunks.slice(0, 3).map((c) => ({
        score: c.score,
        preview: c.content.substring(0, 100),
      })),
    },
  };
}
