import type { PrismaClient } from '../generated/prisma';

export interface ResolvedModel {
  providerSlug: string;
  externalModelId: string;
  modelLabel: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  capabilities: string[];
}

const GLOBAL_DEFAULT_MODEL: ResolvedModel = {
  providerSlug: 'openrouter',
  externalModelId: 'openai/gpt-4o-mini',
  modelLabel: 'openrouter/openai/gpt-4o-mini',
  inputCostPer1k: 0.00015,
  outputCostPer1k: 0.0006,
  capabilities: ['text', 'structured_output'],
};

type ModelWithProvider = {
  externalId: string;
  inputCostPer1k: unknown;
  outputCostPer1k: unknown;
  capabilities: string[];
  provider: { slug: string };
};

const mapModelToResolved = (model: ModelWithProvider): ResolvedModel => ({
  providerSlug: model.provider.slug,
  externalModelId: model.externalId,
  modelLabel: `${model.provider.slug}/${model.externalId}`,
  inputCostPer1k: Number(model.inputCostPer1k),
  outputCostPer1k: Number(model.outputCostPer1k),
  capabilities: model.capabilities ?? [],
});

const modelMatchesCapabilities = (
  model: ModelWithProvider,
  requiredCapabilities: string[],
): boolean => {
  const caps = model.capabilities ?? [];
  return requiredCapabilities.some((capability) => caps.includes(capability));
};

/**
 * Resolves the LLM model for an agent step.
 * Fallback chain: step policy (matching capabilities) → agent policy → global default.
 */
export const resolveStepModel = async (
  prisma: PrismaClient,
  params: {
    agentId: string;
    stepKey?: string;
    /** When set, step/agent policies must expose at least one of these capabilities. */
    requiredCapabilities?: string[];
  },
): Promise<ResolvedModel> => {
  const { agentId, stepKey } = params;
  const requiredCapabilities = params.requiredCapabilities ?? ['text', 'structured_output'];

  if (stepKey) {
    const stepPolicy = await prisma.agentStepModelPolicy.findUnique({
      where: { agentId_stepKey: { agentId, stepKey } },
      include: {
        model: { include: { provider: true } },
      },
    });

    if (
      stepPolicy?.isEnabled &&
      stepPolicy.model?.provider &&
      modelMatchesCapabilities(stepPolicy.model, requiredCapabilities)
    ) {
      return mapModelToResolved(stepPolicy.model);
    }
  }

  const agentPolicy = await prisma.agentModelPolicy.findUnique({
    where: { agentId },
    include: {
      model: { include: { provider: true } },
    },
  });

  if (
    agentPolicy?.isEnabled &&
    agentPolicy.model?.provider &&
    modelMatchesCapabilities(agentPolicy.model, requiredCapabilities)
  ) {
    return mapModelToResolved(agentPolicy.model);
  }

  return GLOBAL_DEFAULT_MODEL;
};

/**
 * Resolves a speech-to-text model for a step override only.
 * Does not fall back to the agent text model — returns undefined so the
 * caller can use provider defaults (e.g. AssemblyAI universal-3-pro).
 */
export const resolveStepSpeechModel = async (
  prisma: PrismaClient,
  params: { agentId: string; stepKey: string },
): Promise<string | undefined> => {
  const stepPolicy = await prisma.agentStepModelPolicy.findUnique({
    where: { agentId_stepKey: { agentId: params.agentId, stepKey: params.stepKey } },
    include: { model: true },
  });

  if (
    stepPolicy?.isEnabled &&
    stepPolicy.model.isEnabled &&
    stepPolicy.model.capabilities.includes('speech')
  ) {
    return stepPolicy.model.externalId;
  }

  return undefined;
};

export const calculateModelCost = (
  model: ResolvedModel,
  tokensInput: number,
  tokensOutput: number,
): number =>
  (tokensInput / 1000) * model.inputCostPer1k + (tokensOutput / 1000) * model.outputCostPer1k;
