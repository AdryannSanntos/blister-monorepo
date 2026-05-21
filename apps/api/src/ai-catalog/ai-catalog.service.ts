import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
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
  constructor(private readonly prisma: PrismaService) {}

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
