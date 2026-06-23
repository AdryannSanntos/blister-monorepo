import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@company-os/db';
import {
  EmbeddingModelNotConfiguredError,
  ModelNotFoundError,
} from '../../errors';
import {
  calculateModelCost,
  resolveModelById,
  resolvePlatformCaptionModel,
  resolvePlatformEmbeddingModel,
  resolveStepModel,
} from './model-resolver';

const model = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  externalId: 'openai/gpt-4o-mini',
  isEnabled: true,
  capabilities: ['text', 'structured_output'],
  inputCostPer1k: 0.15,
  outputCostPer1k: 0.6,
  provider: { slug: 'openrouter', isEnabled: true },
  ...over,
});

/** Builds a fake PrismaClient exposing only the delegates the resolver uses. */
const fakePrisma = (delegates: Record<string, unknown>): PrismaClient =>
  delegates as unknown as PrismaClient;

describe('resolveModelById', () => {
  it('maps an enabled model with its provider', async () => {
    const prisma = fakePrisma({
      aiModel: { findUnique: async () => model() },
    });
    const resolved = await resolveModelById(prisma, 'm1');
    expect(resolved).toMatchObject({
      modelId: 'm1',
      providerSlug: 'openrouter',
      externalModelId: 'openai/gpt-4o-mini',
      modelLabel: 'openrouter/openai/gpt-4o-mini',
      inputCostPer1k: 0.15,
    });
  });

  it('throws ModelNotFoundError when missing', async () => {
    const prisma = fakePrisma({ aiModel: { findUnique: async () => null } });
    await expect(resolveModelById(prisma, 'nope')).rejects.toThrowError(
      ModelNotFoundError,
    );
  });

  it('throws ModelNotFoundError when the provider is disabled', async () => {
    const prisma = fakePrisma({
      aiModel: {
        findUnique: async () =>
          model({ provider: { slug: 'gemini', isEnabled: false } }),
      },
    });
    await expect(resolveModelById(prisma, 'm1')).rejects.toThrowError(
      ModelNotFoundError,
    );
  });
});

describe('resolveStepModel', () => {
  it('prefers a matching enabled step policy', async () => {
    const prisma = fakePrisma({
      agentStepModelPolicy: {
        findUnique: async () => ({ isEnabled: true, model: model() }),
      },
      agentModelPolicy: { findUnique: async () => null },
    });
    const resolved = await resolveStepModel(prisma, {
      agentId: 'cuts',
      stepKey: 'transcribe',
    });
    expect(resolved.modelId).toBe('m1');
  });

  it('falls back to the agent policy when no step policy', async () => {
    const prisma = fakePrisma({
      agentStepModelPolicy: { findUnique: async () => null },
      agentModelPolicy: {
        findUnique: async () => ({ isEnabled: true, model: model() }),
      },
    });
    const resolved = await resolveStepModel(prisma, { agentId: 'cuts' });
    expect(resolved.providerSlug).toBe('openrouter');
  });

  it('throws when no policy is configured (no hardcoded default)', async () => {
    const prisma = fakePrisma({
      agentStepModelPolicy: { findUnique: async () => null },
      agentModelPolicy: { findUnique: async () => null },
    });
    await expect(
      resolveStepModel(prisma, { agentId: 'cuts', stepKey: 's' }),
    ).rejects.toThrowError(ModelNotFoundError);
  });

  it('ignores a policy whose model lacks the required capability', async () => {
    const prisma = fakePrisma({
      agentStepModelPolicy: { findUnique: async () => null },
      agentModelPolicy: {
        findUnique: async () => ({
          isEnabled: true,
          model: model({ capabilities: ['speech'] }),
        }),
      },
    });
    await expect(
      resolveStepModel(prisma, { agentId: 'cuts' }),
    ).rejects.toThrowError(ModelNotFoundError);
  });
});

describe('resolvePlatformEmbeddingModel', () => {
  it('returns the configured embedding model', async () => {
    const prisma = fakePrisma({
      ragPlatformSettings: {
        findUnique: async () => ({
          embeddingModel: model({ capabilities: ['embedding'] }),
        }),
      },
    });
    const resolved = await resolvePlatformEmbeddingModel(prisma);
    expect(resolved.modelId).toBe('m1');
  });

  it('throws EmbeddingModelNotConfiguredError when unset', async () => {
    const prisma = fakePrisma({
      ragPlatformSettings: {
        findUnique: async () => ({ embeddingModel: null }),
      },
    });
    await expect(resolvePlatformEmbeddingModel(prisma)).rejects.toThrowError(
      EmbeddingModelNotConfiguredError,
    );
  });
});

describe('resolvePlatformCaptionModel', () => {
  it('returns null when no caption model id is set', async () => {
    const prisma = fakePrisma({
      ragPlatformSettings: { findUnique: async () => ({ captionModelId: null }) },
    });
    expect(await resolvePlatformCaptionModel(prisma)).toBeNull();
  });

  it('resolves the caption model when set and enabled', async () => {
    const prisma = fakePrisma({
      ragPlatformSettings: {
        findUnique: async () => ({ captionModelId: 'm1' }),
      },
      aiModel: { findUnique: async () => model({ capabilities: ['text'] }) },
    });
    const resolved = await resolvePlatformCaptionModel(prisma);
    expect(resolved?.modelId).toBe('m1');
  });
});

describe('calculateModelCost', () => {
  it('computes cost from per-1k pricing', () => {
    const cost = calculateModelCost(
      { inputCostPer1k: 0.15, outputCostPer1k: 0.6 },
      { tokensInput: 1000, tokensOutput: 2000 },
    );
    expect(cost).toBeCloseTo(0.15 + 1.2, 6);
  });
});
