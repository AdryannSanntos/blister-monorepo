import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { AgentContextFileDto, AgentContextReferenceDto } from './dto/agent-context.dto';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

export interface AgentContextSnapshot {
  organizationId: string;
  agentId: string;
  agentProfile: Record<string, unknown>;
  files: Array<{ id: string; filename: string; objectKey: string }>;
  references: Array<{ sourceType: string; sourceId: string }>;
  companyContext: Record<string, unknown>;
}

@Injectable()
export class AgentContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForRun(organizationId: string, agentId: string): Promise<AgentContextSnapshot> {
    const [agent, profile] = await Promise.all([
      this.prisma.companyAgent.findFirst({
        where: { id: agentId, organizationId },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.agentContextProfile.findUnique({
        where: { agentId },
        include: {
          files: { where: { status: 'active' } },
          references: true,
        },
      }),
    ]);

    return {
      organizationId,
      agentId,
      agentProfile: {
        name: agent?.name,
        instructions: profile?.instructions ?? null,
        notes: profile?.notes ?? null,
      },
      files: (profile?.files ?? []).map((f) => ({
        id: f.id,
        filename: f.filename,
        objectKey: f.objectKey,
      })),
      references: (profile?.references ?? []).map((r) => ({
        sourceType: r.sourceType,
        sourceId: r.sourceId,
      })),
      companyContext: {},
    };
  }

  async persistSnapshot(runId: string, snapshot: AgentContextSnapshot): Promise<void> {
    await this.prisma.agentRunContextSnapshot.create({
      data: {
        runId,
        layers: toJsonValue({
          company: snapshot.companyContext,
          agent: snapshot.agentProfile,
          runtime: { files: snapshot.files.length, references: snapshot.references.length },
        }),
        resolvedSummary: `Contexto congelado com ${snapshot.files.length} arquivo(s) e ${snapshot.references.length} referencia(s).`,
        metadata: toJsonValue({
          organizationId: snapshot.organizationId,
          agentId: snapshot.agentId,
        }),
        items: {
          create: [
            ...snapshot.files.map((f) => ({
              sourceType: 'agent_file',
              sourceId: f.id,
              label: f.filename,
              metadata: toJsonValue({ objectKey: f.objectKey }),
            })),
            ...snapshot.references.map((r) => ({
              sourceType: r.sourceType,
              sourceId: r.sourceId,
              label: `${r.sourceType}:${r.sourceId}`,
            })),
          ],
        },
      },
    });
  }

  async updateAgentContext(
    organizationId: string,
    agentId: string,
    update: { instructions?: string; notes?: string },
  ) {
    await this.assertAgent(organizationId, agentId);

    return this.prisma.agentContextProfile.upsert({
      where: { agentId },
      create: {
        agentId,
        instructions: update.instructions,
        notes: update.notes,
      },
      update: {
        instructions: update.instructions,
        notes: update.notes,
      },
    });
  }

  async getAgentContext(organizationId: string, agentId: string) {
    await this.assertAgent(organizationId, agentId);

    return this.prisma.agentContextProfile.findUnique({
      where: { agentId },
      include: {
        files: { orderBy: { createdAt: 'desc' } },
        references: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async listFiles(organizationId: string, agentId: string) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);
    return this.prisma.agentContextFile.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFile(organizationId: string, agentId: string, dto: AgentContextFileDto) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);

    return this.prisma.agentContextFile.create({
      data: {
        profileId: profile.id,
        filename: dto.filename,
        objectKey: dto.objectKey,
        publicUrl: dto.publicUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: dto.status,
        metadata: toJsonValue(dto.metadata ?? {}),
      },
    });
  }

  async archiveFile(organizationId: string, agentId: string, fileId: string) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);

    const file = await this.prisma.agentContextFile.findFirst({
      where: { id: fileId, profileId: profile.id },
    });
    if (!file) {
      throw new NotFoundException('Context file not found');
    }

    return this.prisma.agentContextFile.update({
      where: { id: fileId },
      data: { status: 'archived' },
    });
  }

  async listReferences(organizationId: string, agentId: string) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);
    return this.prisma.agentContextReference.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReference(
    organizationId: string,
    agentId: string,
    dto: AgentContextReferenceDto,
  ) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);

    return this.prisma.agentContextReference.upsert({
      where: {
        profileId_sourceType_sourceId: {
          profileId: profile.id,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
        },
      },
      create: {
        profileId: profile.id,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        metadata: toJsonValue(dto.metadata ?? {}),
      },
      update: {
        metadata: toJsonValue(dto.metadata ?? {}),
      },
    });
  }

  async removeReference(organizationId: string, agentId: string, referenceId: string) {
    await this.assertAgent(organizationId, agentId);
    const profile = await this.getOrCreateProfile(agentId);

    const reference = await this.prisma.agentContextReference.findFirst({
      where: { id: referenceId, profileId: profile.id },
    });
    if (!reference) {
      throw new NotFoundException('Context reference not found');
    }

    await this.prisma.agentContextReference.delete({ where: { id: referenceId } });
    return { id: referenceId };
  }

  private async assertAgent(organizationId: string, agentId: string) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { id: true },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  private async getOrCreateProfile(agentId: string) {
    return this.prisma.agentContextProfile.upsert({
      where: { agentId },
      create: { agentId },
      update: {},
    });
  }
}
