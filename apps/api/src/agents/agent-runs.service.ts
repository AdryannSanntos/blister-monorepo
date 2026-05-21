import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { ExecuteAgentDto, ListAgentRunsDto } from './dto';
import { AgentExecutionService } from './agent-execution.service';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class AgentRunsService {
  constructor(
    private readonly prisma: PrismaService,
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
        agentId,
        agentVersionId: agent.activeVersionId,
        status: 'queued',
        inputPayload: toJsonValue(input.input),
        createdByUserId: userId,
      },
    });

    await this.agentExecutionService.enqueueRun({
      organizationId,
      agentRunId: run.id,
      agentId,
      agentVersionId: agent.activeVersionId,
    });

    return run;
  }

  async listRuns(organizationId: string, filters: ListAgentRunsDto, viewerUserId: string) {
    return this.prisma.agentRun.findMany({
      where: {
        organizationId,
        ...(filters.agentId ? { agentId: filters.agentId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.onlyOwnRuns ? { createdByUserId: viewerUserId } : {}),
      },
      include: { agent: true, agentVersion: true, steps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRun(
    organizationId: string,
    runId: string,
    viewerUserId: string,
    onlyOwnRuns = false,
  ) {
    const run = await this.prisma.agentRun.findFirst({
      where: {
        id: runId,
        organizationId,
        ...(onlyOwnRuns ? { createdByUserId: viewerUserId } : {}),
      },
      include: { agent: true, agentVersion: true, steps: true },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    return run;
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
}
