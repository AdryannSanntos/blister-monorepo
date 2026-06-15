import { resolveStepModel } from './resolve-model';

const speechModel = {
  externalId: 'universal-3-pro',
  inputCostPer1k: 0.001,
  outputCostPer1k: 0,
  capabilities: ['speech'],
  provider: { slug: 'assemblyai-stt' },
};

const textModel = {
  externalId: 'gemini-2.5-flash-lite',
  inputCostPer1k: 0.00005,
  outputCostPer1k: 0.0002,
  capabilities: ['text', 'structured_output'],
  provider: { slug: 'assemblyai' },
};

const createPrismaMock = (overrides?: {
  stepPolicy?: { isEnabled: boolean; model: typeof speechModel | typeof textModel } | null;
  agentPolicy?: { isEnabled: boolean; model: typeof textModel } | null;
}) => ({
  agentStepModelPolicy: {
    findUnique: jest.fn().mockResolvedValue(overrides?.stepPolicy ?? null),
  },
  agentModelPolicy: {
    findUnique: jest.fn().mockResolvedValue(overrides?.agentPolicy ?? null),
  },
});

describe('resolveStepModel', () => {
  it('skips speech-only step policies for text LLM resolution', async () => {
    const prisma = createPrismaMock({
      stepPolicy: { isEnabled: true, model: speechModel },
      agentPolicy: { isEnabled: true, model: textModel },
    });

    const resolved = await resolveStepModel(prisma as never, {
      agentId: 'cuts',
      stepKey: 'resolve_source',
      requiredCapabilities: ['text', 'structured_output'],
    });

    expect(resolved.providerSlug).toBe('assemblyai');
    expect(resolved.externalModelId).toBe('gemini-2.5-flash-lite');
  });

  it('uses text step policy when capabilities match', async () => {
    const prisma = createPrismaMock({
      stepPolicy: { isEnabled: true, model: textModel },
      agentPolicy: {
        isEnabled: true,
        model: {
          ...textModel,
          externalId: 'gpt-4o-mini',
          provider: { slug: 'openrouter' },
        },
      },
    });

    const resolved = await resolveStepModel(prisma as never, {
      agentId: 'cuts',
      stepKey: 'rank_segments',
      requiredCapabilities: ['text', 'structured_output'],
    });

    expect(resolved.externalModelId).toBe('gemini-2.5-flash-lite');
  });
});
