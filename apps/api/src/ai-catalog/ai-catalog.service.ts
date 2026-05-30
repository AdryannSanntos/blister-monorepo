import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AIRuntimeResolvedCredential, AIProviderAdapter } from '../ai-runtime/adapters/ai-provider.adapter';
import { AnthropicAdapter } from '../ai-runtime/adapters/anthropic.adapter';
import { GeminiAdapter } from '../ai-runtime/adapters/gemini.adapter';
import { OpenAIAdapter } from '../ai-runtime/adapters/openai.adapter';
import { OpenRouterAdapter } from '../ai-runtime/adapters/openrouter.adapter';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BuilderCatalogQueryDto,
  CreateCredentialDto,
  CreateModelDto,
  CreateProviderDto,
  ListModelsDto,
  ListPoliciesDto,
  UpdateCredentialDto,
  UpdateModelDto,
  UpdateProviderDto,
  UpsertPolicyDto,
} from './dto';

type CredentialWithSecret = {
  value?: string;
  [key: string]: unknown;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

@Injectable()
export class AICatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouterAdapter: OpenRouterAdapter,
    private readonly openAIAdapter: OpenAIAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {}

  async listProviders() {
    const providers = await this.prisma.aIProvider.findMany({
      orderBy: { name: 'asc' },
    });

    return providers.map((provider) => this.sanitizeProvider(provider));
  }

  async createProvider(input: CreateProviderDto) {
    try {
      const data: Prisma.AIProviderUncheckedCreateInput = {
        slug: input.slug,
        name: input.name,
        description: input.description,
        status: input.status,
        iconMetadata: toJsonValue(input.iconMetadata),
        capabilityMetadata: toJsonValue(input.capabilityMetadata),
        pricingMetadata: toJsonValue(input.pricingMetadata),
        limitsMetadata: toJsonValue(input.limitsMetadata),
        schemaMetadata: toJsonValue(input.schemaMetadata),
      };

      return await this.prisma.aIProvider.create({ data });
    } catch (error) {
      this.handleKnownError(error, 'AI provider');
    }
  }

  async updateProvider(providerId: string, input: UpdateProviderDto) {
    try {
      const data: Prisma.AIProviderUncheckedUpdateInput = {
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.iconMetadata ? { iconMetadata: toJsonValue(input.iconMetadata) } : {}),
        ...(input.capabilityMetadata
          ? { capabilityMetadata: toJsonValue(input.capabilityMetadata) }
          : {}),
        ...(input.pricingMetadata ? { pricingMetadata: toJsonValue(input.pricingMetadata) } : {}),
        ...(input.limitsMetadata ? { limitsMetadata: toJsonValue(input.limitsMetadata) } : {}),
        ...(input.schemaMetadata ? { schemaMetadata: toJsonValue(input.schemaMetadata) } : {}),
      };

      return await this.prisma.aIProvider.update({
        where: { id: providerId },
        data,
      });
    } catch (error) {
      this.handleKnownError(error, 'AI provider');
    }
  }

  async listModels(filters: ListModelsDto) {
    const policies = filters.organizationId
      ? await this.prisma.aIProviderPolicy.findMany({
          where: {
            organizationId: filters.organizationId,
            ...(filters.providerId ? { providerId: filters.providerId } : {}),
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

    const allowedModelIds = Array.from(new Set(policies.flatMap((policy) => policy.allowedModelIds)));

    const models = await this.prisma.aIModel.findMany({
      where: {
        ...(filters.providerId ? { providerId: filters.providerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(allowedModelIds.length > 0 ? { id: { in: allowedModelIds } } : {}),
      },
      include: {
        provider: true,
      },
      orderBy: [{ providerId: 'asc' }, { name: 'asc' }],
    });

    return models.map((model) => this.sanitizeModel(model));
  }

  async createModel(input: CreateModelDto) {
    try {
      const data: Prisma.AIModelUncheckedCreateInput = {
        providerId: input.providerId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        externalModelId: input.externalModelId,
        status: input.status,
        capabilityMetadata: toJsonValue(input.capabilityMetadata),
        pricingMetadata: toJsonValue(input.pricingMetadata),
        limitsMetadata: toJsonValue(input.limitsMetadata),
        schemaMetadata: toJsonValue(input.schemaMetadata),
      };

      return await this.prisma.aIModel.create({ data });
    } catch (error) {
      this.handleKnownError(error, 'AI model');
    }
  }

  async updateModel(modelId: string, input: UpdateModelDto) {
    try {
      const data: Prisma.AIModelUncheckedUpdateInput = {
        ...(input.providerId ? { providerId: input.providerId } : {}),
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.externalModelId ? { externalModelId: input.externalModelId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.capabilityMetadata
          ? { capabilityMetadata: toJsonValue(input.capabilityMetadata) }
          : {}),
        ...(input.pricingMetadata ? { pricingMetadata: toJsonValue(input.pricingMetadata) } : {}),
        ...(input.limitsMetadata ? { limitsMetadata: toJsonValue(input.limitsMetadata) } : {}),
        ...(input.schemaMetadata ? { schemaMetadata: toJsonValue(input.schemaMetadata) } : {}),
      };

      return await this.prisma.aIModel.update({
        where: { id: modelId },
        data,
      });
    } catch (error) {
      this.handleKnownError(error, 'AI model');
    }
  }

  async createCredential(actorUserId: string, input: CreateCredentialDto) {
    try {
      const data: Prisma.AICredentialUncheckedCreateInput = {
        providerId: input.providerId,
        organizationId: input.organizationId ?? null,
        label: input.label,
        value: input.value,
        schemaMetadata: toJsonValue(input.schemaMetadata),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      };

      const credential = await this.prisma.aICredential.create({
        data,
      });

      return this.sanitizeCredential(credential);
    } catch (error) {
      this.handleKnownError(error, 'AI credential');
    }
  }

  async updateCredential(actorUserId: string, credentialId: string, input: UpdateCredentialDto) {
    try {
      const data: Prisma.AICredentialUncheckedUpdateInput = {
        ...(input.providerId ? { providerId: input.providerId } : {}),
        ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
        ...(input.label ? { label: input.label } : {}),
        ...(input.value ? { value: input.value } : {}),
        ...(input.schemaMetadata ? { schemaMetadata: toJsonValue(input.schemaMetadata) } : {}),
        updatedByUserId: actorUserId,
      };

      const credential = await this.prisma.aICredential.update({
        where: { id: credentialId },
        data,
      });

      return this.sanitizeCredential(credential);
    } catch (error) {
      this.handleKnownError(error, 'AI credential');
    }
  }

  async listPolicies(filters: ListPoliciesDto) {
    return this.prisma.aIProviderPolicy.findMany({
      where: {
        ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
        ...(filters.providerId ? { providerId: filters.providerId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertPolicy(actorUserId: string, input: UpsertPolicyDto) {
    try {
      const createData: Prisma.AIProviderPolicyUncheckedCreateInput = {
        organizationId: input.organizationId,
        providerId: input.providerId,
        allowedModelIds: input.allowedModelIds,
        metadata: toJsonValue(input.metadata),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      };
      const updateData: Prisma.AIProviderPolicyUncheckedUpdateInput = {
        allowedModelIds: input.allowedModelIds,
        metadata: toJsonValue(input.metadata),
        updatedByUserId: actorUserId,
      };

      return await this.prisma.aIProviderPolicy.upsert({
        where: {
          organizationId_providerId: {
            organizationId: input.organizationId,
            providerId: input.providerId,
          },
        },
        create: createData,
        update: updateData,
      });
    } catch (error) {
      this.handleKnownError(error, 'AI provider policy');
    }
  }

  async syncProviderModels(providerId: string, organizationId?: string) {
    const provider = await this.prisma.aIProvider.findUnique({ where: { id: providerId } });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    const credential = await this.resolveSyncCredential(providerId, provider.slug, organizationId);
    if (!credential) {
      return {
        providerId: provider.id,
        providerSlug: provider.slug,
        status: 'skipped' as const,
        reason: 'No credential available for provider sync',
      };
    }

    const adapter = this.resolveAdapter(provider.slug);
    const remoteModels = await adapter.listModels(credential);
    let createdCount = 0;
    let updatedCount = 0;

    for (const model of remoteModels) {
      const existingModel = await this.prisma.aIModel.findFirst({
        where: {
          providerId,
          OR: [{ externalModelId: model.externalModelId }, { slug: model.slug }],
        },
        select: { id: true },
      });

      if (existingModel) {
        await this.prisma.aIModel.update({
          where: { id: existingModel.id },
          data: {
            slug: model.slug,
            name: model.name,
            description: model.description,
            externalModelId: model.externalModelId,
            status: model.status,
            capabilityMetadata: toJsonValue(model.capabilityMetadata),
            pricingMetadata: toJsonValue(model.pricingMetadata),
            limitsMetadata: toJsonValue(model.limitsMetadata),
            schemaMetadata: toJsonValue(model.schemaMetadata),
          },
        });
        updatedCount += 1;
        continue;
      }

      await this.prisma.aIModel.create({
        data: {
          providerId,
          slug: model.slug,
          name: model.name,
          description: model.description,
          externalModelId: model.externalModelId,
          status: model.status,
          capabilityMetadata: toJsonValue(model.capabilityMetadata),
          pricingMetadata: toJsonValue(model.pricingMetadata),
          limitsMetadata: toJsonValue(model.limitsMetadata),
          schemaMetadata: toJsonValue(model.schemaMetadata),
        },
      });
      createdCount += 1;
    }

    return {
      providerId: provider.id,
      providerSlug: provider.slug,
      status: 'synced' as const,
      syncedCount: remoteModels.length,
      createdCount,
      updatedCount,
    };
  }

  async syncAllProviderModels(organizationId?: string) {
    const providers = await this.prisma.aIProvider.findMany({ orderBy: { name: 'asc' } });
    const results: Array<Record<string, unknown>> = [];

    for (const provider of providers) {
      try {
        results.push(await this.syncProviderModels(provider.id, organizationId));
      } catch (error) {
        results.push({
          providerId: provider.id,
          providerSlug: provider.slug,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Provider sync failed',
        });
      }
    }

    return { results };
  }

  async listBuilderCatalog(organizationId: string, filters: BuilderCatalogQueryDto = {}) {
    const policies = await this.prisma.aIProviderPolicy.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });

    const allowedModelIds = Array.from(
      new Set(policies.flatMap((policy) => policy.allowedModelIds)),
    );

    const models = await this.prisma.aIModel.findMany({
      where: {
        status: 'active',
        ...(allowedModelIds.length > 0 ? { id: { in: allowedModelIds } } : {}),
      },
      include: {
        provider: true,
      },
      orderBy: [{ providerId: 'asc' }, { name: 'asc' }],
    });

    const filteredModels = models.filter((model) => {
      const provider = model.provider;
      if (!provider || provider.status !== 'active') {
        return false;
      }

      if (!this.matchesBuilderCatalogKind(model.capabilityMetadata, filters.kind)) {
        return false;
      }

      return this.providerSupportsBuilderCatalogKind(provider.slug, filters.kind);
    });

    const providerIds = new Set(filteredModels.map((model) => model.providerId));

    const providers = await this.prisma.aIProvider.findMany({
      where: {
        status: 'active',
        id: { in: Array.from(providerIds) },
      },
      orderBy: { name: 'asc' },
    });

    return {
      providers: providers.map((provider) => ({
        id: provider.id,
        slug: provider.slug,
        name: provider.name,
      })),
      models: filteredModels.map((model) => ({
        id: model.id,
        providerId: model.providerId,
        name: model.name,
        capabilityMetadata: model.capabilityMetadata,
      })),
    };
  }

  private matchesBuilderCatalogKind(
    capabilityMetadata: unknown,
    kind: BuilderCatalogQueryDto['kind'],
  ) {
    if (!kind) {
      return true;
    }

    const capabilities =
      capabilityMetadata && typeof capabilityMetadata === 'object' && !Array.isArray(capabilityMetadata)
        ? (capabilityMetadata as Record<string, unknown>)
        : {};

    if (kind === 'image') {
      return capabilities.image === true;
    }

    return capabilities.text === true || capabilities.image !== true;
  }

  private providerSupportsBuilderCatalogKind(
    providerSlug: string,
    kind: BuilderCatalogQueryDto['kind'],
  ) {
    try {
      const adapter = this.resolveAdapter(providerSlug);

      if (kind === 'image') {
        return adapter.supports('image_generation');
      }

      if (kind === 'text') {
        return adapter.supports('text_generation');
      }

      return (
        adapter.supports('text_generation') ||
        adapter.supports('image_generation')
      );
    } catch {
      return false;
    }
  }

  private sanitizeProvider<T extends Record<string, unknown>>(provider: T) {
    const { credentials: _credentials, ...safeProvider } = provider;
    return safeProvider;
  }

  private sanitizeModel<T extends Record<string, unknown>>(model: T) {
    const safeModel = { ...model } as Record<string, unknown>;
    const provider = safeModel.provider;

    if (provider && typeof provider === 'object' && !Array.isArray(provider)) {
      safeModel.provider = this.sanitizeProvider(provider as Record<string, unknown>);
    }

    return safeModel;
  }

  private sanitizeCredential<T extends CredentialWithSecret>(credential: T) {
    const { value: _value, ...safeCredential } = credential;
    return safeCredential;
  }

  private resolveAdapter(providerSlug: string): AIProviderAdapter {
    switch (providerSlug) {
      case 'openrouter':
        return this.openRouterAdapter;
      case 'openai':
        return this.openAIAdapter;
      case 'anthropic':
        return this.anthropicAdapter;
      case 'gemini':
        return this.geminiAdapter;
      default:
        throw new NotFoundException(`No adapter available for provider ${providerSlug}`);
    }
  }

  private async resolveSyncCredential(
    providerId: string,
    providerSlug: string,
    organizationId?: string,
  ): Promise<AIRuntimeResolvedCredential | null> {
    if (organizationId) {
      const companyCredential = await this.prisma.aICredential.findFirst({
        where: { organizationId, providerId },
        orderBy: { updatedAt: 'desc' },
      });

      if (companyCredential) {
        return { id: companyCredential.id, value: companyCredential.value, scope: 'company' };
      }
    }

    const platformCredential = await this.prisma.aICredential.findFirst({
      where: { organizationId: null, providerId },
      orderBy: { updatedAt: 'desc' },
    });

    if (platformCredential) {
      return { id: platformCredential.id, value: platformCredential.value, scope: 'platform' };
    }

    return this.resolveEnvCredential(providerSlug);
  }

  private resolveEnvCredential(providerSlug: string): AIRuntimeResolvedCredential | null {
    const envMap: Record<string, string | undefined> = {
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
    };

    const value = this.normalizeEnvCredential(envMap[providerSlug]);
    if (!value) {
      return null;
    }

    return {
      id: `env:${providerSlug}`,
      value,
      scope: 'platform',
    };
  }

  private normalizeEnvCredential(value: string | undefined) {
    const normalized = value?.trim();
    if (!normalized || normalized === 'change-me') {
      return null;
    }

    return normalized;
  }

  private handleKnownError(error: unknown, resourceLabel: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(`${resourceLabel} already exists`);
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(`${resourceLabel} not found`);
      }
    }

    throw error;
  }
}
