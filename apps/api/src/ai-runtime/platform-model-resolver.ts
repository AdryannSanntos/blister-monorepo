import type { PrismaClient } from '../generated/prisma';

export type ResolvedPlatformModel = {
  modelId: string;
  providerSlug: string;
  externalModelId: string;
  modelLabel: string;
};

export const RAG_EMBEDDING_DIMENSIONS = 1536;

const DEFAULT_EMBEDDING_MODEL = 'openrouter/openai/text-embedding-3-small';

const parseModelLabel = (modelLabel: string): ResolvedPlatformModel => {
  const parts = modelLabel.split('/');
  const providerSlug = parts[0] ?? 'openrouter';
  const externalModelId = parts.slice(1).join('/') || modelLabel;

  return {
    modelId: '',
    providerSlug,
    externalModelId,
    modelLabel,
  };
};

export const resolvePlatformEmbeddingModel = async (
  prisma: PrismaClient,
): Promise<ResolvedPlatformModel> => {
  const settings = await prisma.ragPlatformSettings.findUnique({
    where: { id: 'default' },
    include: {
      embeddingModel: {
        include: { provider: true },
      },
    },
  });

  const model = settings?.embeddingModel;
  const provider = model?.provider;

  if (model && provider?.isEnabled && model.isEnabled) {
    return {
      modelId: model.id,
      providerSlug: provider.slug,
      externalModelId: model.externalId,
      modelLabel: `${provider.slug}/${model.externalId}`,
    };
  }

  return parseModelLabel(DEFAULT_EMBEDDING_MODEL);
};

export const resolvePlatformCaptionModel = async (
  prisma: PrismaClient,
): Promise<ResolvedPlatformModel | null> => {
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

  if (!model?.provider?.isEnabled || !model.isEnabled) {
    return null;
  }

  return {
    modelId: model.id,
    providerSlug: model.provider.slug,
    externalModelId: model.externalId,
    modelLabel: `${model.provider.slug}/${model.externalId}`,
  };
};
