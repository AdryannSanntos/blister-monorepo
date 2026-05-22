import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentQueueService } from './agent-queue.service';
import type { ExecuteAgentDto, ListAgentRunsDto } from './dto';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class AgentRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentQueueService: AgentQueueService,
    private readonly agentExecutionService: AgentExecutionService,
  ) {}

  async createQueuedRun(
    organizationId: string,
    agentId: string,
    userId: string,
    input: ExecuteAgentDto,
  ) {
    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.activeVersionId) {
      throw new NotFoundException('Agent does not have an active version');
    }

    const run = await this.prisma.agentRun.create({
      data: {
        organizationId,
        threadId:
          typeof input.input.threadId === 'string' && input.input.threadId.length > 0
            ? input.input.threadId
            : null,
        sourceMessageId:
          typeof input.input.messageId === 'string' && input.input.messageId.length > 0
            ? input.input.messageId
            : null,
        agentId,
        agentVersionId: agent.activeVersionId,
        status: 'queued',
        inputPayload: toJsonValue(input.input),
        createdByUserId: userId,
      },
    });

    const promotedRun = await this.agentQueueService.promoteNextQueuedRun(organizationId);

    if (promotedRun?.id === run.id) {
      try {
        await this.agentExecutionService.enqueueRun({
          organizationId,
          agentRunId: run.id,
          agentId,
          agentVersionId: agent.activeVersionId,
        });
      } catch {
        await this.prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: 'queued',
            processingLeaseId: null,
            leaseExpiresAt: null,
          },
        });
      }
    }

    if (run.sourceMessageId) {
      await this.prisma.agentChatMessage.update({
        where: { id: run.sourceMessageId },
        data: { agentRunId: run.id },
      });
    }

    return promotedRun ?? run;
  }

  async listRuns(organizationId: string, filters: ListAgentRunsDto, viewerUserId: string) {
    const runs = await this.prisma.agentRun.findMany({
      where: {
        organizationId,
        ...(filters.agentId ? { agentId: filters.agentId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.onlyOwnRuns ? { createdByUserId: viewerUserId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        threadId: true,
        sourceMessageId: true,
        agentId: true,
        agentVersionId: true,
        status: true,
        queuePosition: true,
        attemptCount: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
          },
        },
        steps: {
          select: {
            id: true,
            blockKey: true,
            blockType: true,
            status: true,
            errorMessage: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachRunLedgerSummaries(runs);
  }

  async getRun(organizationId: string, runId: string, viewerUserId: string, onlyOwnRuns = false) {
    const run = await this.prisma.agentRun.findFirst({
      where: {
        id: runId,
        organizationId,
        ...(onlyOwnRuns ? { createdByUserId: viewerUserId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        threadId: true,
        sourceMessageId: true,
        agentId: true,
        agentVersionId: true,
        status: true,
        queuePosition: true,
        attemptCount: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
        outputPayload: true,
        processingMetadata: true,
        agent: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
          },
        },
        steps: {
          select: {
            id: true,
            blockKey: true,
            blockType: true,
            status: true,
            errorMessage: true,
            metadata: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    const [creditEntries, technicalCosts] = await Promise.all([
      this.prisma.creditLedgerEntry.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.technicalCostLedgerEntry.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { run, creditEntries, technicalCosts };
  }

  async listPlatformRuns(filters: {
    providerId?: string;
    modelId?: string;
    organizationId?: string;
    agentTemplateId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    minCost?: number;
    maxCost?: number;
  }) {
    const runs = await this.prisma.agentRun.findMany({
      where: {
        ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              createdAt: {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
              },
            }
          : {}),
      },
      include: { agent: true, agentVersion: true, steps: true },
      orderBy: { createdAt: 'desc' },
    });

    const costs = await this.prisma.technicalCostLedgerEntry.findMany({
      where: {
        ...(filters.providerId ? { providerId: filters.providerId } : {}),
        ...(filters.modelId ? { modelId: filters.modelId } : {}),
      },
    });
    const costsByRunId = new Map<string, number>();
    for (const cost of costs) {
      if (!cost.runId) continue;
      costsByRunId.set(cost.runId, (costsByRunId.get(cost.runId) ?? 0) + cost.amount);
    }

    return runs
      .filter((run) => {
        if (filters.agentTemplateId && run.agent.templateId !== filters.agentTemplateId) {
          return false;
        }

        const totalCost = costsByRunId.get(run.id) ?? 0;
        if (filters.providerId && !costsByRunId.has(run.id)) {
          return false;
        }
        if (filters.modelId && !costsByRunId.has(run.id)) {
          return false;
        }
        if (filters.minCost !== undefined && totalCost < filters.minCost) {
          return false;
        }
        if (filters.maxCost !== undefined && totalCost > filters.maxCost) {
          return false;
        }

        return true;
      })
      .map((run) => ({ ...run, totalTechnicalCost: costsByRunId.get(run.id) ?? 0 }));
  }

  async getPlatformRun(runId: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      include: { agent: true, agentVersion: true, steps: true },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    const costs = await this.prisma.technicalCostLedgerEntry.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    const creditEntries = await this.prisma.creditLedgerEntry.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    const auditSummary = await this.prisma.auditLog.findMany({
      where: { targetOrganizationId: run.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { run, costs, creditEntries, auditSummary };
  }

  private async attachRunLedgerSummaries<TRun extends { id: string }>(runs: TRun[]) {
    if (runs.length === 0) {
      return runs.map((run) => ({
        ...run,
        creditDelta: 0,
        technicalCost: 0,
      }));
    }

    const runIds = runs.map((run) => run.id);
    const [creditEntries, technicalCosts] = await Promise.all([
      this.prisma.creditLedgerEntry.findMany({
        where: { runId: { in: runIds } },
        select: { runId: true, amount: true },
      }),
      this.prisma.technicalCostLedgerEntry.findMany({
        where: { runId: { in: runIds } },
        select: { runId: true, amount: true },
      }),
    ]);

    const creditByRunId = new Map<string, number>();
    for (const entry of creditEntries) {
      if (!entry.runId) continue;
      creditByRunId.set(entry.runId, (creditByRunId.get(entry.runId) ?? 0) + entry.amount);
    }

    const costByRunId = new Map<string, number>();
    for (const entry of technicalCosts) {
      if (!entry.runId) continue;
      costByRunId.set(entry.runId, (costByRunId.get(entry.runId) ?? 0) + entry.amount);
    }

    return runs.map((run) => ({
      ...run,
      creditDelta: creditByRunId.get(run.id) ?? 0,
      technicalCost: costByRunId.get(run.id) ?? 0,
    }));
  }
}
