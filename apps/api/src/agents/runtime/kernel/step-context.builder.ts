import type { PrismaClient } from '../../../generated/prisma';
import type { BrandProfile, ContextPack, StepExecutionContext } from './types';

export interface ContextPackBuilder {
  buildPack(params: {
    companyId: string;
    query: string;
    agentId: string;
    campaignId?: string;
    includeBrandBrain?: boolean;
    includeAgentLearning?: boolean;
    includeCampaignContext?: boolean;
  }): Promise<ContextPack>;
}

export interface CreateContextParams {
  runId: string;
  agentId: string;
  companyId: string;
  campaignId: string | null;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
}

export async function buildStepContext(
  prisma: PrismaClient,
  contextPackBuilder: ContextPackBuilder | null,
  params: CreateContextParams,
): Promise<StepExecutionContext> {
  const [brandProfile, contextPack, previousSteps] = await Promise.all([
    getBrandProfile(prisma, params.companyId),
    buildContextPack(contextPackBuilder, params),
    getPreviousStepsOutput(prisma, params.runId),
  ]);

  return {
    runId: params.runId,
    agentId: params.agentId,
    companyId: params.companyId,
    campaignId: params.campaignId,
    stepKey: params.stepKey,
    stepIndex: params.stepIndex,
    inputPayload: params.inputPayload,
    previousStepsOutput: previousSteps,
    contextPack,
    brandProfile,
  };
}

async function getBrandProfile(
  prisma: PrismaClient,
  companyId: string,
): Promise<BrandProfile | null> {
  const profile = await prisma.brandProfile.findUnique({
    where: { companyId },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    companyId: profile.companyId,
    brandVoice: profile.brandVoice,
    niche: profile.niche,
    description: profile.description,
    targetAudience: profile.targetAudience,
    marketingObjective: profile.marketingObjective,
    mainProducts: profile.mainProducts,
    differentiators: profile.differentiators,
    visualStyle: profile.visualStyle,
    palette: profile.palette,
    typography: profile.typography,
    socialNetworks: (profile.socialNetworks as string[]) ?? [],
  };
}

async function buildContextPack(
  contextPackBuilder: ContextPackBuilder | null,
  params: CreateContextParams,
): Promise<ContextPack> {
  const userInput = (params.inputPayload as { userInput?: string }).userInput ?? '';

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
    includeCampaignContext: !!params.campaignId,
  });
}

async function getPreviousStepsOutput(
  prisma: PrismaClient,
  runId: string,
): Promise<Record<string, Record<string, unknown>>> {
  const steps = await prisma.agentRunStep.findMany({
    where: { agentRunId: runId, status: 'COMPLETED' },
    orderBy: { stepIndex: 'asc' },
  });

  const output: Record<string, Record<string, unknown>> = {};
  for (const step of steps) {
    output[step.stepKey] = step.outputPayload as Record<string, unknown>;
  }

  return output;
}

export function formatBrandContext(profile: BrandProfile | null): string {
  if (!profile) return '';

  const parts: string[] = [];

  if (profile.niche) parts.push(`Nicho: ${profile.niche}`);
  if (profile.description) parts.push(`Descrição: ${profile.description}`);
  if (profile.brandVoice) parts.push(`Tom de voz: ${profile.brandVoice}`);
  if (profile.targetAudience) parts.push(`Público-alvo: ${profile.targetAudience}`);
  if (profile.marketingObjective) parts.push(`Objetivo: ${profile.marketingObjective}`);
  if (profile.mainProducts) parts.push(`Produtos/Serviços: ${profile.mainProducts}`);
  if (profile.differentiators) parts.push(`Diferenciais: ${profile.differentiators}`);
  if (profile.visualStyle) parts.push(`Estilo visual: ${profile.visualStyle}`);

  return parts.join('\n');
}

export function formatContextPackForPrompt(contextPack: ContextPack): string {
  if (contextPack.chunks.length === 0) return '';

  const sections: string[] = [];

  const brandChunks = contextPack.chunks.filter((c) => c.sourceType === 'BRAND_BRAIN');
  const learningChunks = contextPack.chunks.filter((c) => c.sourceType === 'AGENT_LEARNING');
  const campaignChunks = contextPack.chunks.filter((c) =>
    ['CAMPAIGN', 'CAMPAIGN_FILE'].includes(c.sourceType),
  );

  if (brandChunks.length > 0) {
    sections.push('## Contexto da Marca\n' + brandChunks.map((c) => c.content).join('\n\n'));
  }

  if (learningChunks.length > 0) {
    sections.push(
      '## Aprendizados Anteriores\n' + learningChunks.map((c) => c.content).join('\n\n'),
    );
  }

  if (campaignChunks.length > 0) {
    sections.push(
      '## Contexto da Campanha\n' + campaignChunks.map((c) => c.content).join('\n\n'),
    );
  }

  return sections.join('\n\n');
}
