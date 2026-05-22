import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AICatalogService } from './ai-catalog.service';

const makeMockPrisma = () => ({
  aIProvider: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  aIModel: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  aICredential: {
    create: jest.fn(),
    update: jest.fn(),
  },
  aIProviderPolicy: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('AICatalogService', () => {
  let service: AICatalogService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AICatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AICatalogService>(AICatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a provider with icon metadata', async () => {
    const provider = {
      id: 'provider-1',
      slug: 'openrouter',
      name: 'OpenRouter',
      status: 'active',
      iconMetadata: { iconKey: 'openrouter', iconUrl: 'https://example.com/openrouter.svg' },
      capabilityMetadata: { chat: true },
      pricingMetadata: {},
      limitsMetadata: {},
      schemaMetadata: {},
      description: 'Unified AI gateway',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.aIProvider.create.mockResolvedValue(provider);

    const result = await service.createProvider({
      slug: 'openrouter',
      name: 'OpenRouter',
      description: 'Unified AI gateway',
      status: 'active',
      iconMetadata: { iconKey: 'openrouter', iconUrl: 'https://example.com/openrouter.svg' },
      capabilityMetadata: { chat: true },
      pricingMetadata: {},
      limitsMetadata: {},
      schemaMetadata: {},
    });

    expect(prisma.aIProvider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'openrouter',
        status: 'active',
        iconMetadata: { iconKey: 'openrouter', iconUrl: 'https://example.com/openrouter.svg' },
      }),
    });
    expect(result).toEqual(provider);
  });

  it('creates a model under a provider with capabilities', async () => {
    const model = {
      id: 'model-1',
      providerId: 'provider-1',
      slug: 'openrouter-gpt-4o-mini',
      name: 'GPT-4o Mini',
      externalModelId: 'openai/gpt-4o-mini',
      status: 'active',
      capabilityMetadata: { text: true, vision: true },
      pricingMetadata: { inputPerMillion: 0.15 },
      limitsMetadata: { maxOutputTokens: 16384 },
      schemaMetadata: {},
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.aIModel.create.mockResolvedValue(model);

    const result = await service.createModel({
      providerId: 'provider-1',
      slug: 'openrouter-gpt-4o-mini',
      name: 'GPT-4o Mini',
      externalModelId: 'openai/gpt-4o-mini',
      status: 'active',
      capabilityMetadata: { text: true, vision: true },
      pricingMetadata: { inputPerMillion: 0.15 },
      limitsMetadata: { maxOutputTokens: 16384 },
      schemaMetadata: {},
    });

    expect(prisma.aIModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: 'provider-1',
        capabilityMetadata: { text: true, vision: true },
      }),
    });
    expect(result).toEqual(model);
  });

  it('disables a model without deleting it', async () => {
    const updated = {
      id: 'model-1',
      providerId: 'provider-1',
      slug: 'openrouter-gpt-4o-mini',
      name: 'GPT-4o Mini',
      externalModelId: 'openai/gpt-4o-mini',
      status: 'disabled',
      capabilityMetadata: { text: true },
      pricingMetadata: {},
      limitsMetadata: {},
      schemaMetadata: {},
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.aIModel.update.mockResolvedValue(updated);

    const result = await service.updateModel('model-1', { status: 'disabled' });

    expect(prisma.aIModel.update).toHaveBeenCalledWith({
      where: { id: 'model-1' },
      data: expect.objectContaining({ status: 'disabled' }),
    });
    expect(result.status).toBe('disabled');
  });

  it('creates a platform credential', async () => {
    prisma.aICredential.create.mockResolvedValue({
      id: 'credential-1',
      providerId: 'provider-1',
      organizationId: null,
      label: 'Primary OpenRouter',
      value: 'secret-platform-key',
      createdByUserId: 'actor-1',
      updatedByUserId: 'actor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createCredential('actor-1', {
      providerId: 'provider-1',
      label: 'Primary OpenRouter',
      value: 'secret-platform-key',
      schemaMetadata: {},
    });

    expect(prisma.aICredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: 'provider-1',
        organizationId: null,
        value: 'secret-platform-key',
        createdByUserId: 'actor-1',
        updatedByUserId: 'actor-1',
      }),
    });
    expect(result).not.toHaveProperty('value');
  });

  it('creates a company credential', async () => {
    prisma.aICredential.create.mockResolvedValue({
      id: 'credential-2',
      providerId: 'provider-1',
      organizationId: 'org-1',
      label: 'Acme OpenAI Key',
      value: 'secret-company-key',
      createdByUserId: 'actor-1',
      updatedByUserId: 'actor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createCredential('actor-1', {
      providerId: 'provider-1',
      organizationId: 'org-1',
      label: 'Acme OpenAI Key',
      value: 'secret-company-key',
      schemaMetadata: {},
    });

    expect(prisma.aICredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        value: 'secret-company-key',
      }),
    });
    expect(result).not.toHaveProperty('value');
  });

  it('returns provider and model lists without credential secrets', async () => {
    prisma.aIProvider.findMany.mockResolvedValue([
      {
        id: 'provider-1',
        slug: 'openrouter',
        name: 'OpenRouter',
        status: 'active',
        description: null,
        iconMetadata: {},
        capabilityMetadata: {},
        pricingMetadata: {},
        limitsMetadata: {},
        schemaMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        credentials: [{ id: 'credential-1', value: 'secret-platform-key', label: 'Primary' }],
      },
    ]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        providerId: 'provider-1',
        slug: 'openrouter-gpt-4o-mini',
        name: 'GPT-4o Mini',
        externalModelId: 'openai/gpt-4o-mini',
        status: 'active',
        description: null,
        capabilityMetadata: {},
        pricingMetadata: {},
        limitsMetadata: {},
        schemaMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: 'provider-1',
          slug: 'openrouter',
          name: 'OpenRouter',
          status: 'active',
          description: null,
          iconMetadata: {},
          capabilityMetadata: {},
          pricingMetadata: {},
          limitsMetadata: {},
          schemaMetadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          credentials: [{ id: 'credential-1', value: 'secret-platform-key', label: 'Primary' }],
        },
      },
    ]);

    const providers = await service.listProviders();
    const models = await service.listModels({});

    expect(providers[0]).not.toHaveProperty('credentials');
    expect(JSON.stringify(models)).not.toContain('secret-platform-key');
  });

  it('restricts models by company policy', async () => {
    prisma.aIProviderPolicy.findMany.mockResolvedValue([
      {
        id: 'policy-1',
        organizationId: 'org-1',
        providerId: 'provider-1',
        allowedModelIds: ['model-2'],
        metadata: { notes: 'Only approved model' },
        createdByUserId: 'actor-1',
        updatedByUserId: 'actor-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.aIModel.findMany.mockResolvedValue([
      {
        id: 'model-2',
        providerId: 'provider-1',
        slug: 'openrouter-claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        externalModelId: 'anthropic/claude-3.5-sonnet',
        status: 'active',
        description: null,
        capabilityMetadata: { text: true },
        pricingMetadata: {},
        limitsMetadata: {},
        schemaMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.listModels({
      organizationId: 'org-1',
      providerId: 'provider-1',
    });

    expect(prisma.aIProviderPolicy.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', providerId: 'provider-1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(prisma.aIModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'provider-1',
          id: { in: ['model-2'] },
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('model-2');
  });

  it('upserts a company policy', async () => {
    prisma.aIProviderPolicy.upsert.mockResolvedValue({
      id: 'policy-1',
      organizationId: 'org-1',
      providerId: 'provider-1',
      allowedModelIds: ['model-2'],
      metadata: { notes: 'Only approved model' },
      createdByUserId: 'actor-1',
      updatedByUserId: 'actor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.upsertPolicy('actor-1', {
      organizationId: 'org-1',
      providerId: 'provider-1',
      allowedModelIds: ['model-2'],
      metadata: { notes: 'Only approved model' },
    });

    expect(prisma.aIProviderPolicy.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_providerId: {
          organizationId: 'org-1',
          providerId: 'provider-1',
        },
      },
      create: expect.objectContaining({
        organizationId: 'org-1',
        providerId: 'provider-1',
        allowedModelIds: ['model-2'],
        createdByUserId: 'actor-1',
        updatedByUserId: 'actor-1',
      }),
      update: expect.objectContaining({
        allowedModelIds: ['model-2'],
        updatedByUserId: 'actor-1',
      }),
    });
    expect(result.allowedModelIds).toEqual(['model-2']);
  });
});
