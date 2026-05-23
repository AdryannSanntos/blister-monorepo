import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCompanyAgentDto,
  SaveDraftVersionDto,
  UpdateCompanyAgentDto,
} from './dto';

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanyAgents(organizationId: string) {
    return this.prisma.companyAgent.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCompanyAgent(organizationId: string, agentId: string) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async createCompanyAgent(organizationId: string, userId: string, input: CreateCompanyAgentDto) {
    const template = input.templateId
      ? await this.prisma.agentTemplate.findUnique({ where: { id: input.templateId } })
      : null;

    if (input.templateId && !template) {
      throw new NotFoundException('Agent template not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const agent = await tx.companyAgent.create({
        data: {
          organizationId,
          templateId: input.templateId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          status: 'draft',
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });

      await tx.agentVersion.create({
        data: {
          agentId: agent.id,
          versionNumber: 1,
          status: 'draft',
          flowDefinition: toJsonValue(template?.defaultFlow ?? input.flowDefinition ?? {}),
          inputSchema: toJsonValue(template?.defaultInputSchema ?? input.inputSchema ?? {}),
          outputSchema: toJsonValue(template?.defaultOutputSchema ?? input.outputSchema ?? {}),
          createdByUserId: userId,
        },
      });

      return agent;
    });
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

    return this.prisma.companyAgent.update({
      where: { id: agentId },
      data: {
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedByUserId: userId,
      },
    });
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

  async activateVersion(organizationId: string, agentId: string, versionId: string, userId: string) {
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
}
