import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CompleteOnboardingDto,
  CreateCompanyAgentDto,
  SaveDraftVersionDto,
  UpdateAgentModelDto,
  UpdateCompanyAgentDto,
} from './dto';
import { SystemAgentsService } from './system-agents/system-agents.service';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const DEFAULT_AGENT_ALLOWED_TOOLS = ['rag_search', 'file_search'] as const;

const normalizeAllowedTools = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((tool): tool is string => typeof tool === 'string') : [];

const resolveAgentAllowedTools = (value: unknown, status?: unknown): string[] => {
  const normalized = normalizeAllowedTools(value);
  if (normalized.length > 0) {
    return normalized;
  }
  return status === 'active' ? [...DEFAULT_AGENT_ALLOWED_TOOLS] : [];
};

const normalizeAgentWithEffectiveAllowedTools = <
  T extends { allowedTools?: unknown; status?: unknown },
>(
  agent: T,
): T & { allowedTools: string[] } => ({
  ...agent,
  allowedTools: resolveAgentAllowedTools(agent.allowedTools, agent.status),
});

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemAgents: SystemAgentsService,
  ) {}

  async listCompanyAgents(organizationId: string) {
    const agents = await this.prisma.companyAgent.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });

    return agents.map((agent) => normalizeAgentWithEffectiveAllowedTools(agent));
  }

  async getCompanyAgent(organizationId: string, agentId: string) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return normalizeAgentWithEffectiveAllowedTools(agent);
  }

  async createCompanyAgent(organizationId: string, userId: string, input: CreateCompanyAgentDto) {
    const template = input.templateId
      ? await this.prisma.agentTemplate.findUnique({ where: { id: input.templateId } })
      : null;

    if (input.templateId && !template) {
      throw new NotFoundException('Agent template not found');
    }

    const agent = await this.prisma.$transaction(async (tx) => {
      const created = await tx.companyAgent.create({
        data: {
          organizationId,
          templateId: input.templateId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          allowedTools: input.allowedTools ?? [...DEFAULT_AGENT_ALLOWED_TOOLS],
          status: 'draft',
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });

      await tx.agentVersion.create({
        data: {
          agentId: created.id,
          versionNumber: 1,
          status: 'draft',
          flowDefinition: toJsonValue(template?.defaultFlow ?? input.flowDefinition ?? {}),
          inputSchema: toJsonValue(template?.defaultInputSchema ?? input.inputSchema ?? {}),
          outputSchema: toJsonValue(template?.defaultOutputSchema ?? input.outputSchema ?? {}),
          createdByUserId: userId,
        },
      });

      return created;
    });

    // Gera as mensagens de exemplo em background — não pode atrasar nem quebrar
    // a criação do agente. Persistidas no próprio agente quando prontas.
    void this.generateAndPersistInitialMessages(organizationId, agent.id);

    return normalizeAgentWithEffectiveAllowedTools(agent);
  }

  private async generateAndPersistInitialMessages(organizationId: string, agentId: string) {
    try {
      const result = await this.systemAgents.generateInitialMessages(organizationId, agentId);
      if (result.status !== 'completed' || !result.data || result.data.messages.length === 0) {
        return;
      }
      await this.prisma.companyAgent.update({
        where: { id: agentId },
        data: { suggestedMessages: toJsonValue(result.data.messages) },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist initial messages for agent ${agentId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async updateCompanyAgent(
    organizationId: string,
    agentId: string,
    userId: string,
    input: UpdateCompanyAgentDto,
  ) {
    await this.getCompanyAgent(organizationId, agentId);

    if (input.status === 'active') {
      throw new BadRequestException('Use the activate endpoint to mark an agent as active');
    }

    return normalizeAgentWithEffectiveAllowedTools(
      await this.prisma.companyAgent.update({
        where: { id: agentId },
        data: {
          ...(input.slug ? { slug: input.slug } : {}),
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.allowedTools !== undefined ? { allowedTools: input.allowedTools } : {}),
          ...(input.status ? { status: input.status } : {}),
          updatedByUserId: userId,
        },
      }),
    );
  }

  async saveDraftVersion(
    organizationId: string,
    agentId: string,
    userId: string,
    input: SaveDraftVersionDto,
  ) {
    await this.getCompanyAgent(organizationId, agentId);

    const latestDraft = await this.prisma.agentVersion.findFirst({
      where: { agentId, status: 'draft' },
      orderBy: { versionNumber: 'desc' },
    });

    if (latestDraft) {
      return this.prisma.agentVersion.update({
        where: { id: latestDraft.id },
        data: {
          flowDefinition: toJsonValue(input.flowDefinition),
          inputSchema: toJsonValue(input.inputSchema),
          outputSchema: toJsonValue(input.outputSchema),
          notes: input.notes,
        },
      });
    }

    const lastVersion = await this.prisma.agentVersion.findFirst({
      where: { agentId },
      orderBy: { versionNumber: 'desc' },
    });

    return this.prisma.agentVersion.create({
      data: {
        agentId,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        status: 'draft',
        flowDefinition: toJsonValue(input.flowDefinition),
        inputSchema: toJsonValue(input.inputSchema),
        outputSchema: toJsonValue(input.outputSchema),
        notes: input.notes,
        createdByUserId: userId,
      },
    });
  }

  async publishVersion(organizationId: string, agentId: string, versionId: string, userId: string) {
    await this.getCompanyAgent(organizationId, agentId);

    const version = await this.prisma.agentVersion.findFirst({
      where: { id: versionId, agentId },
    });

    if (!version) {
      throw new NotFoundException('Agent version not found');
    }

    if (version.status !== 'draft') {
      throw new BadRequestException('Only draft versions can be published');
    }

    return this.prisma.agentVersion.update({
      where: { id: versionId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedByUserId: userId,
      },
    });
  }

  async activateVersion(
    organizationId: string,
    agentId: string,
    versionId: string,
    userId: string,
  ) {
    await this.getCompanyAgent(organizationId, agentId);

    const version = await this.prisma.agentVersion.findFirst({
      where: { id: versionId, agentId },
    });

    if (!version) {
      throw new NotFoundException('Agent version not found');
    }

    if (version.status !== 'published') {
      throw new BadRequestException('Only published versions can be activated');
    }

    return this.prisma.companyAgent.update({
      where: { id: agentId },
      data: {
        activeVersionId: versionId,
        status: 'active',
        updatedByUserId: userId,
      },
    });
  }

  async archiveAgent(organizationId: string, agentId: string, userId: string) {
    await this.getCompanyAgent(organizationId, agentId);

    return this.prisma.companyAgent.update({
      where: { id: agentId },
      data: { status: 'archived', updatedByUserId: userId },
    });
  }

  async reactivateAgent(organizationId: string, agentId: string, userId: string) {
    const agent = await this.getCompanyAgent(organizationId, agentId);

    return this.prisma.companyAgent.update({
      where: { id: agentId },
      data: {
        status: agent.activeVersionId ? 'active' : 'draft',
        updatedByUserId: userId,
      },
    });
  }

  async completeOnboarding(
    organizationId: string,
    agentId: string,
    userId: string,
    input: CompleteOnboardingDto,
  ) {
    await this.getCompanyAgent(organizationId, agentId);

    return this.prisma.$transaction(async (tx) => {
      // Upsert context profile
      if (input.instructions !== undefined || input.notes !== undefined) {
        const existing = await tx.agentContextProfile.findFirst({ where: { agentId } });
        if (existing) {
          await tx.agentContextProfile.update({
            where: { id: existing.id },
            data: {
              ...(input.instructions !== undefined
                ? { instructions: input.instructions || null }
                : {}),
              ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            },
          });
        } else {
          await tx.agentContextProfile.create({
            data: {
              agentId,
              instructions: input.instructions || null,
              notes: input.notes || null,
            },
          });
        }
      }

      // Create references
      if (input.references && input.references.length > 0) {
        const profile = await tx.agentContextProfile.findFirst({ where: { agentId } });
        if (profile) {
          await tx.agentContextReference.createMany({
            data: input.references.map((ref) => ({
              profileId: profile.id,
              sourceType: ref.sourceType,
              sourceId: ref.sourceId,
              label: ref.label ?? null,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Save modelId in flowDefinition of latest version
      if (input.modelId) {
        const latestVersion = await tx.agentVersion.findFirst({
          where: { agentId },
          orderBy: { versionNumber: 'desc' },
        });
        if (latestVersion) {
          const currentFlow =
            latestVersion.flowDefinition && typeof latestVersion.flowDefinition === 'object'
              ? (latestVersion.flowDefinition as Record<string, unknown>)
              : {};
          const currentConfig =
            currentFlow.config && typeof currentFlow.config === 'object'
              ? (currentFlow.config as Record<string, unknown>)
              : {};
          await tx.agentVersion.update({
            where: { id: latestVersion.id },
            data: {
              flowDefinition: toJsonValue({
                ...currentFlow,
                config: { ...currentConfig, modelId: input.modelId },
              }),
            },
          });
        }
      }

      // Activate agent
      return normalizeAgentWithEffectiveAllowedTools(
        await tx.companyAgent.update({
          where: { id: agentId },
          data: {
            ...(input.description !== undefined ? { description: input.description || null } : {}),
            allowedTools: input.allowedTools ?? [...DEFAULT_AGENT_ALLOWED_TOOLS],
            status: 'active',
            onboardingCompletedAt: new Date(),
            updatedByUserId: userId,
          },
        }),
      );
    });
  }

  async updateAgentModel(
    organizationId: string,
    agentId: string,
    userId: string,
    input: UpdateAgentModelDto,
  ) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { id: true, activeVersionId: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const patchVersion = async (versionId: string) => {
      const version = await this.prisma.agentVersion.findUnique({ where: { id: versionId } });
      if (!version) return;
      const currentFlow =
        version.flowDefinition && typeof version.flowDefinition === 'object'
          ? (version.flowDefinition as Record<string, unknown>)
          : {};
      const currentConfig =
        currentFlow.config && typeof currentFlow.config === 'object'
          ? (currentFlow.config as Record<string, unknown>)
          : {};
      await this.prisma.agentVersion.update({
        where: { id: versionId },
        data: {
          flowDefinition: toJsonValue({
            ...currentFlow,
            config: { ...currentConfig, modelId: input.modelId },
          }),
        },
      });
    };

    // Always update the active version so the chat picks it up immediately.
    if (agent.activeVersionId) {
      await patchVersion(agent.activeVersionId);
    }

    // Also update the latest draft so re-publishing preserves the choice.
    const latestVersion = await this.prisma.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    if (latestVersion && latestVersion.id !== agent.activeVersionId) {
      await patchVersion(latestVersion.id);
    }

    if (!agent.activeVersionId && !latestVersion) {
      throw new NotFoundException('Agent has no version');
    }

    return { modelId: input.modelId };
  }
}
