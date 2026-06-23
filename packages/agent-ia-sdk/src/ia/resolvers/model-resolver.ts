import type { PrismaClient } from '@company-os/db';
import {
  EmbeddingModelNotConfiguredError,
  ModelNotFoundError,
} from '../../errors';

/** A model resolved from the `AiModel` catalog, with its provider + pricing. */
export interface ResolvedModel {
  modelId: string;
  providerSlug: string;
  externalModelId: string;
  modelLabel: string;
  capabilities: string[];
  inputCostPer1k: number;
  outputCostPer1k: number;
}

/** Default capability set a text/structured step requires. */
const DEFAULT_TEXT_CAPABILITIES = ['text', 'structured_output'];

type ModelWithProvider = {
  id: string;
  externalId: string;
  isEnabled: boolean;
  capabilities: string[];
  inputCostPer1k: unknown;
  outputCostPer1k: unknown;
  provider: { slug: string; isEnabled: boolean };
};

const mapModel = (model: ModelWithProvider): ResolvedModel => ({
  modelId: model.id,
  providerSlug: model.provider.slug,
  externalModelId: model.externalId,
  modelLabel: `${model.provider.slug}/${model.externalId}`,
  capabilities: model.capabilities ?? [],
  inputCostPer1k: Number(model.inputCostPer1k),
  outputCostPer1k: Number(model.outputCostPer1k),
});

const hasAnyCapability = (
  model: ModelWithProvider,
  required: string[],
): boolean => {
  const caps = model.capabilities ?? [];
  return required.some((capability) => caps.includes(capability));
};

const isUsable = (model: ModelWithProvider): boolean =>
  model.isEnabled && model.provider.isEnabled;

/**
 * Resolves a model by its catalog id. Throws `ModelNotFoundError` if the model
 * does not exist or is disabled (provider disabled counts as disabled).
 */
export const resolveModelById = async (
  prisma: PrismaClient,
  modelId: string,
): Promise<ResolvedModel> => {
  const model = await prisma.aiModel.findUnique({
    where: { id: modelId },
    include: { provider: true },
  });

  if (!model || !isUsable(model)) {
    throw new ModelNotFoundError(modelId);
  }

  return mapModel(model);
};

/**
 * Resolves the model for an agent step.
 *
 * Fallback chain: step policy (with matching capability) → agent policy.
 * There is **no** hardcoded global default — if neither policy is configured
 * (or enabled, or capability-matching) this throws. The admin must configure a
 * policy via the catalog.
 */
export const resolveStepModel = async (
  prisma: PrismaClient,
  params: {
    agentId: string;
    stepKey?: string;
    /** Step/agent policy must expose at least one of these capabilities. */
    requiredCapabilities?: string[];
  },
): Promise<ResolvedModel> => {
  const { agentId, stepKey } = params;
  const requiredCapabilities =
    params.requiredCapabilities ?? DEFAULT_TEXT_CAPABILITIES;

  if (stepKey) {
    const stepPolicy = await prisma.agentStepModelPolicy.findUnique({
      where: { agentId_stepKey: { agentId, stepKey } },
      include: { model: { include: { provider: true } } },
    });

    if (
      stepPolicy?.isEnabled &&
      stepPolicy.model &&
      isUsable(stepPolicy.model) &&
      hasAnyCapability(stepPolicy.model, requiredCapabilities)
    ) {
      return mapModel(stepPolicy.model);
    }
  }

  const agentPolicy = await prisma.agentModelPolicy.findUnique({
    where: { agentId },
    include: { model: { include: { provider: true } } },
  });

  if (
    agentPolicy?.isEnabled &&
    agentPolicy.model &&
    isUsable(agentPolicy.model) &&
    hasAnyCapability(agentPolicy.model, requiredCapabilities)
  ) {
    return mapModel(agentPolicy.model);
  }

  throw new ModelNotFoundError(
    `agent="${agentId}"${stepKey ? ` step="${stepKey}"` : ''} (no enabled policy with capabilities [${requiredCapabilities.join(', ')}])`,
  );
};

/**
 * Resolves a speech-to-text model from a *step* policy only — does not fall
 * back to the agent text model. Returns `undefined` so the caller can use the
 * transcription provider's own default (e.g. AssemblyAI universal-3-pro).
 */
export const resolveStepSpeechModel = async (
  prisma: PrismaClient,
  params: { agentId: string; stepKey: string },
): Promise<string | undefined> => {
  const stepPolicy = await prisma.agentStepModelPolicy.findUnique({
    where: {
      agentId_stepKey: { agentId: params.agentId, stepKey: params.stepKey },
    },
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

/**
 * Resolves the platform embedding model from `RagPlatformSettings`. Throws
 * `EmbeddingModelNotConfiguredError` if none is selected or it is disabled —
 * there is **no** hardcoded default embedding model.
 */
export const resolvePlatformEmbeddingModel = async (
  prisma: PrismaClient,
): Promise<ResolvedModel> => {
  const settings = await prisma.ragPlatformSettings.findUnique({
    where: { id: 'default' },
    include: { embeddingModel: { include: { provider: true } } },
  });

  const model = settings?.embeddingModel;
  if (!model || !isUsable(model)) {
    throw new EmbeddingModelNotConfiguredError();
  }

  return mapModel(model);
};

/**
 * Resolves the platform caption model from `RagPlatformSettings`. Caption is
 * optional, so this returns `null` when unset or disabled.
 */
export const resolvePlatformCaptionModel = async (
  prisma: PrismaClient,
): Promise<ResolvedModel | null> => {
  const settings = await prisma.ragPlatformSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings?.captionModelId) {
    return null;
  }

  const model = await prisma.aiModel.findUnique({
    where: { id: settings.captionModelId },
    include: { provider: true },
  });

  if (!model || !isUsable(model)) {
    return null;
  }

  return mapModel(model);
};

/** Computes USD cost for a completion from a resolved model's per-1k pricing. */
export const calculateModelCost = (
  model: Pick<ResolvedModel, 'inputCostPer1k' | 'outputCostPer1k'>,
  usage: { tokensInput: number; tokensOutput: number },
): number =>
  (usage.tokensInput / 1000) * model.inputCostPer1k +
  (usage.tokensOutput / 1000) * model.outputCostPer1k;
