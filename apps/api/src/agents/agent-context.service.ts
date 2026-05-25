import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

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
        include: { files: true, references: true },
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
    await this.prisma.companyAgent.findFirstOrThrow({
      where: { id: agentId, organizationId },
      select: { id: true },
    });

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
    await this.prisma.companyAgent.findFirstOrThrow({
      where: { id: agentId, organizationId },
      select: { id: true },
    });

    return this.prisma.agentContextProfile.findUnique({
      where: { agentId },
      include: { files: true, references: true },
    });
  }
}
