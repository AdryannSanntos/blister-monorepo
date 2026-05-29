import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderExecutionError } from './adapters/ai-provider.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { AIRuntimeService } from './ai-runtime.service';

const makeMockPrisma = () => ({
  aIModel: { findMany: jest.fn() },
  aICredential: { findFirst: jest.fn() },
  aIProviderPolicy: { findMany: jest.fn() },
});

describe('AIRuntimeService', () => {
  let service: AIRuntimeService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  const openRouterAdapter = {
    provider: 'openrouter',
    supports: jest.fn(),
    generateText: jest.fn(),
    generateImage: jest.fn(),
    createEmbedding: jest.fn(),
  };

  beforeEach(async () => {
    prisma = makeMockPrisma();
    openRouterAdapter.supports.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIRuntimeService,
        { provide: PrismaService, useValue: prisma },
        { provide: OpenRouterAdapter, useValue: openRouterAdapter },
        { provide: OpenAIAdapter, useValue: { supports: jest.fn() } },
        { provide: AnthropicAdapter, useValue: { supports: jest.fn() } },
        { provide: GeminiAdapter, useValue: { supports: jest.fn() } },
      ],
    }).compile();

    service = module.get(AIRuntimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = '';
  });

  it('resolves OpenRouter model for text request', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { supportsTextGeneration: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue({
      id: 'cred-1',
      value: 'platform-key',
    });
    openRouterAdapter.generateText.mockResolvedValue({
      text: 'hello',
      usage: { totalTokens: 42 },
    });

    const result = await service.generateText({ prompt: 'hello' });

    expect(openRouterAdapter.generateText).toHaveBeenCalled();
    expect(result.providerSlug).toBe('openrouter');
    expect(result.modelId).toBe('model-1');
  });

  it('rejects model without required capability', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { supportsImageGeneration: false },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);

    await expect(service.generateText({ prompt: 'hello' })).rejects.toThrow(BadRequestException);
  });

  it('uses company credential when policy allows it', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([
      {
        providerId: 'provider-1',
        allowedModelIds: [],
        metadata: { allowCompanyCredentials: true },
      },
    ]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst
      .mockResolvedValueOnce({ id: 'company-cred', value: 'company-key' })
      .mockResolvedValueOnce({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockResolvedValue({ text: 'hello', usage: {} });

    const result = await service.generateText({ organizationId: 'org-1', prompt: 'hello' });

    expect(result.credentialScope).toBe('company');
    expect(openRouterAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ credential: expect.objectContaining({ id: 'company-cred' }) }),
    );
  });

  it('falls back to platform credential when no company credential exists', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([
      {
        providerId: 'provider-1',
        allowedModelIds: [],
        metadata: { allowCompanyCredentials: true },
      },
    ]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockResolvedValue({ text: 'hello', usage: {} });

    const result = await service.generateText({ organizationId: 'org-1', prompt: 'hello' });

    expect(result.credentialScope).toBe('platform');
  });

  it('records usage metadata from adapter response', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockResolvedValue({
      text: 'hello',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    const result = await service.generateText({ prompt: 'hello' });

    expect(result.usage.totalTokens).toBe(15);
  });

  it('normalizes provider error', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockRejectedValue(new Error('boom'));

    await expect(service.generateText({ prompt: 'hello' })).rejects.toThrow(ProviderExecutionError);
  });

  it('throws when no credential can be resolved', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue(null);

    await expect(service.generateText({ prompt: 'hello' })).rejects.toThrow(NotFoundException);
  });

  it('uses the modelId explicitly configured in the request', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'configured-model',
        providerId: 'provider-openrouter',
        slug: 'nemotron-3-super',
        externalModelId: 'nvidia/nemotron-3-super-120b-a12b:free',
        updatedAt: new Date('2026-05-24T12:00:00Z'),
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-openrouter',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
      {
        id: 'other-model',
        providerId: 'provider-openrouter',
        slug: 'other',
        externalModelId: 'other/model',
        updatedAt: new Date('2026-05-25T12:00:00Z'),
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-openrouter',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockResolvedValue({
      text: 'Olá! Como posso ajudar?',
      usage: {},
    });

    await service.generateText({
      organizationId: 'org-1',
      modelId: 'configured-model',
      prompt: 'olá',
    });

    expect(openRouterAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ id: 'configured-model' }),
      }),
    );
  });

  it('skips models whose provider has no usable adapter instead of failing selection', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'assemblyai-model',
        providerId: 'provider-assemblyai',
        slug: 'assemblyai-claude-opus',
        externalModelId: 'claude-opus',
        updatedAt: new Date('2026-05-29T12:00:00Z'),
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-assemblyai',
          slug: 'assemblyai',
          schemaMetadata: { adapter: 'assemblyai' },
        },
      },
      {
        id: 'openrouter-model',
        providerId: 'provider-openrouter',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        updatedAt: new Date('2026-05-28T12:00:00Z'),
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-openrouter',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue({ id: 'platform-cred', value: 'platform-key' });
    openRouterAdapter.generateText.mockResolvedValue({ text: 'hello', usage: {} });

    const result = await service.generateText({ prompt: 'hello' });

    expect(result.modelId).toBe('openrouter-model');
    expect(result.providerSlug).toBe('openrouter');
  });

  it('falls back to OPENROUTER_API_KEY when no credential exists in the database', async () => {
    process.env.OPENROUTER_API_KEY = 'env-openrouter-key';

    prisma.aIProviderPolicy.findMany.mockResolvedValue([]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        externalModelId: 'openai/gpt-4o-mini',
        capabilityMetadata: { text: true },
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          schemaMetadata: { adapter: 'openrouter' },
        },
      },
    ]);
    prisma.aICredential.findFirst.mockResolvedValue(null);
    openRouterAdapter.generateText.mockResolvedValue({ text: 'hello', usage: {} });

    const result = await service.generateText({ prompt: 'hello' });

    expect(result.credentialId).toBe('env:openrouter');
    expect(openRouterAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: expect.objectContaining({ value: 'env-openrouter-key' }),
      }),
    );
  });
});
