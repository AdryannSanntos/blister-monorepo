import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentContextService } from './agent-context.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentQueueService } from './agent-queue.service';
import type { ExecuteAgentDto, ListAgentRunsDto } from './dto';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const AGENT_INSIGHTS_WINDOW_DAYS = 30;

type InsightRunRecord = {
  id: string;
  status: string;
  threadId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
};

function getInsightsWindowStart() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (AGENT_INSIGHTS_WINDOW_DAYS - 1));
  return start;
}

function resolveRunDurationMs(run: InsightRunRecord) {
  if (typeof run.durationMs === 'number' && Number.isFinite(run.durationMs)) {
    return run.durationMs;
  }

  if (!run.startedAt || !run.completedAt) {
    return null;
  }

  const duration = run.completedAt.getTime() - run.startedAt.getTime();
  return duration >= 0 ? duration : null;
}

@Injectable()
export class AgentRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentQueueService: AgentQueueService,
    private readonly agentExecutionService: AgentExecutionService,
    private readonly agentContextService: AgentContextService,
  ) {}

  async createQueuedRun(
    organizationId: string,
    agentId: string,
    userId: string,
    input: ExecuteAgentDto,
    parentContext?: { parentRunId: string; parentStepId?: string; depth: number },
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

    const queuedCount = await this.prisma.agentRun.count({
      where: { organizationId, status: 'queued' },
    });
    const parentRun = parentContext?.parentRunId
      ? await this.prisma.agentRun.findUnique({
          where: { id: parentContext.parentRunId },
          select: { id: true, rootRunId: true },
        })
      : null;

    if (parentContext?.parentRunId && !parentRun) {
      throw new NotFoundException('Parent agent run not found');
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
        queuePosition: queuedCount + 1,
        inputPayload: toJsonValue(input.input),
        createdByUserId: userId,
        rootRunId: parentRun ? (parentRun.rootRunId ?? parentRun.id) : undefined,
        parentRunId: parentContext?.parentRunId,
        parentStepId: parentContext?.parentStepId,
        depth: parentContext?.depth ?? 0,
      },
    });

    // Resolve and persist context snapshot
    try {
      const snapshot = await this.agentContextService.resolveForRun(organizationId, agentId);
      await this.agentContextService.persistSnapshot(run.id, snapshot);
    } catch {
      // Context snapshot failure should not block run creation
    }

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

  async getAgentInsights(organizationId: string, agentId: string) {
    const windowStart = getInsightsWindowStart();
    const windowEnd = new Date();

    const agent = await this.prisma.companyAgent.findFirst({
      where: { id: agentId, organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        allowedTools: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const [recentThreads, recentMessages, recentToolCalls, contextProfile] = await Promise.all([
      this.prisma.agentChatThread.findMany({
        where: {
          organizationId,
          agentId,
          scope: 'agent_chat',
          createdAt: { gte: windowStart },
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.agentChatMessage.findMany({
        where: {
          thread: {
            organizationId,
            agentId,
            scope: 'agent_chat',
          },
          createdAt: { gte: windowStart },
        },
        select: {
          id: true,
          role: true,
          content: true,
          threadId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.agentChatToolCall.findMany({
        where: {
          organizationId,
          agentId,
          createdAt: { gte: windowStart },
        },
        select: {
          id: true,
          toolName: true,
          status: true,
          threadId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.agentContextProfile.findFirst({
        where: { agentId },
        select: {
          _count: {
            select: {
              files: true,
              references: true,
            },
          },
        },
      }),
    ]);

    const allowedTools = Array.isArray(agent.allowedTools)
      ? agent.allowedTools.filter((tool): tool is string => typeof tool === 'string')
      : [];

    const dailyMap = new Map<
      string,
      {
        date: string;
        threads: number;
        messages: number;
        assistantMessages: number;
      }
    >();

    for (let index = 0; index < AGENT_INSIGHTS_WINDOW_DAYS; index += 1) {
      const date = new Date(windowStart);
      date.setDate(windowStart.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, threads: 0, messages: 0, assistantMessages: 0 });
    }

    const toolStatusMap = new Map<string, number>();
    const toolNameMap = new Map<string, number>();
    const activeThreads = new Set<string>();
    const respondedThreads = new Set<string>();
    let userMessages = 0;
    let assistantMessages = 0;
    let assistantChars = 0;

    for (const thread of recentThreads) {
      const dateKey = thread.createdAt.toISOString().slice(0, 10);
      const daily = dailyMap.get(dateKey);
      if (daily) {
        daily.threads += 1;
      }
    }

    for (const message of recentMessages) {
      const dateKey = message.createdAt.toISOString().slice(0, 10);
      const daily = dailyMap.get(dateKey);

      if (daily) {
        daily.messages += 1;
        if (message.role === 'assistant') {
          daily.assistantMessages += 1;
        }
      }

      activeThreads.add(message.threadId);

      if (message.role === 'user') {
        userMessages += 1;
      }

      if (message.role === 'assistant') {
        assistantMessages += 1;
        assistantChars += message.content.trim().length;
        respondedThreads.add(message.threadId);
      }
    }

    for (const toolCall of recentToolCalls) {
      activeThreads.add(toolCall.threadId);
      toolStatusMap.set(toolCall.status, (toolStatusMap.get(toolCall.status) ?? 0) + 1);
      toolNameMap.set(toolCall.toolName, (toolNameMap.get(toolCall.toolName) ?? 0) + 1);
    }

    const totalToolCalls = recentToolCalls.length;
    const failedToolCalls = (toolStatusMap.get('error') ?? 0) + (toolStatusMap.get('failed') ?? 0);
    const averageMessagesPerThread =
      activeThreads.size > 0 ? Number((recentMessages.length / activeThreads.size).toFixed(1)) : 0;
    const averageAssistantMessageLength =
      assistantMessages > 0 ? Math.round(assistantChars / assistantMessages) : 0;
    const responseCoverageRate =
      activeThreads.size > 0 ? Math.round((respondedThreads.size / activeThreads.size) * 100) : 0;

    const topTools = Array.from(toolNameMap.entries())
      .map(([toolName, count]) => ({ toolName, count }))
      .sort((left, right) => right.count - left.count);
    const leadingTools = topTools.slice(0, 5);
    const otherToolsCount = topTools.slice(5).reduce((total, item) => total + item.count, 0);
    const toolBreakdown =
      otherToolsCount > 0
        ? [...leadingTools, { toolName: 'other', count: otherToolsCount }]
        : leadingTools;

    return {
      window: {
        days: AGENT_INSIGHTS_WINDOW_DAYS,
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
      },
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
      summary: {
        totalThreads: recentThreads.length,
        activeThreads: activeThreads.size,
        totalMessages: recentMessages.length,
        userMessages,
        assistantMessages,
        responseCoverageRate,
        averageMessagesPerThread,
        averageAssistantMessageLength,
        totalToolCalls,
        failedToolCalls,
        contextFiles: contextProfile?._count.files ?? 0,
        contextReferences: contextProfile?._count.references ?? 0,
        enabledTools: allowedTools.length,
      },
      dailyActivity: Array.from(dailyMap.values()),
      toolStatusBreakdown: Array.from(toolStatusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((left, right) => right.count - left.count),
      topTools: toolBreakdown,
    };
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
