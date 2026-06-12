import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRunBlockService } from './agent-run-block.service';
import type {
  AgentRunBlockDto,
  AgentRunStatus,
  AgentRunStatusDto,
  AgentRunStepDto,
} from '@company-os/types';
import type { AgentRunStatus as PrismaAgentRunStatus, Prisma } from '../../generated/prisma';

export interface ListRunsOptions {
  companyId: string;
  agentId?: string;
  campaignId?: string;
  status?: AgentRunStatus;
  reviewStatus?: 'pending';
  limit?: number;
  offset?: number;
}

export interface RunWithSteps {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
  blocks: AgentRunBlockDto[];
}

@Injectable()
export class AgentRunService {
  private readonly logger = new Logger(AgentRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AgentRegistryService,
    private readonly agentRunBlockService: AgentRunBlockService,
  ) {}

  async findById(runId: string): Promise<AgentRunStatusDto | null> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) return null;

    return this.mapRunToDto(run);
  }

  async findByIdForCompany(runId: string, companyId: string): Promise<AgentRunStatusDto | null> {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, companyId },
    });

    if (!run) return null;

    return this.mapRunToDto(run);
  }

  async findByIdOrThrow(runId: string, companyId?: string): Promise<AgentRunStatusDto> {
    const run = companyId
      ? await this.findByIdForCompany(runId, companyId)
      : await this.findById(runId);
    if (!run) throw new NotFoundException('Agent run not found');
    return run;
  }

  async findWithSteps(runId: string, companyId?: string): Promise<RunWithSteps> {
    const run = companyId
      ? await this.prisma.agentRun.findFirst({
          where: { id: runId, companyId },
          include: {
            steps: { orderBy: { stepIndex: 'asc' } },
          },
        })
      : await this.prisma.agentRun.findUnique({
          where: { id: runId },
          include: {
            steps: { orderBy: { stepIndex: 'asc' } },
          },
        });

    if (!run) throw new NotFoundException('Agent run not found');

    const blocks = await this.agentRunBlockService.listByRun(runId);

    return {
      run: this.mapRunToDto(run),
      steps: run.steps.map((step) => this.mapStepToDto(step)),
      blocks,
    };
  }

  async list(options: ListRunsOptions): Promise<{ runs: AgentRunStatusDto[]; total: number }> {
    const where: Prisma.AgentRunWhereInput = {
      companyId: options.companyId,
    };

    if (options.agentId) where.agentId = options.agentId;
    if (options.campaignId) where.campaignId = options.campaignId;
    if (options.status) where.status = options.status as PrismaAgentRunStatus;

    if (options.reviewStatus === 'pending') {
      where.status = 'PAUSED';
      where.pauseReason = 'awaiting_cut_review';
    }

    const [runs, total] = await Promise.all([
      this.prisma.agentRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      }),
      this.prisma.agentRun.count({ where }),
    ]);

    return {
      runs: runs.map((run) => this.mapRunToDto(run)),
      total,
    };
  }

  async listByAgent(
    companyId: string,
    agentId: string,
    options?: { limit?: number; offset?: number; reviewStatus?: 'pending' },
  ): Promise<{ runs: AgentRunStatusDto[]; total: number }> {
    return this.list({
      companyId,
      agentId,
      limit: options?.limit,
      offset: options?.offset,
      reviewStatus: options?.reviewStatus,
    });
  }

  async listByCampaign(
    companyId: string,
    campaignId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ runs: AgentRunStatusDto[]; total: number }> {
    return this.list({
      companyId,
      campaignId,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async assertRunBelongsToCompany(runId: string, companyId: string): Promise<AgentRunStatusDto> {
    const run = await this.findByIdForCompany(runId, companyId);
    if (!run) {
      throw new ForbiddenException('Agent run not found for this company');
    }
    return run;
  }

  async getRunStats(companyId: string, agentId?: string): Promise<{
    totalRuns: number;
    completed: number;
    failed: number;
    running: number;
    avgCreditCost: number;
  }> {
    const where: Prisma.AgentRunWhereInput = { companyId };
    if (agentId) where.agentId = agentId;

    const [stats, avgCost] = await Promise.all([
      this.prisma.agentRun.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.agentRun.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { creditCost: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of stats) {
      statusCounts[item.status] = item._count.status;
    }

    return {
      totalRuns: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      completed: statusCounts['COMPLETED'] ?? 0,
      failed: statusCounts['FAILED'] ?? 0,
      running: (statusCounts['QUEUED'] ?? 0) + (statusCounts['RUNNING'] ?? 0),
      avgCreditCost: Number(avgCost._avg.creditCost ?? 0),
    };
  }

  private mapRunToDto(run: {
    id: string;
    agentId: string;
    companyId: string;
    campaignId: string | null;
    status: string;
    currentStepKey: string | null;
    inputPayload: unknown;
    outputPayload: unknown;
    errorMessage: string | null;
    pauseReason: string | null;
    pauseFormSchema: unknown;
    creditCost: unknown;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }): AgentRunStatusDto {
    const rawReviewStatus =
      (run.outputPayload as { reviewStatus?: string })?.reviewStatus ?? null;
    const reviewStatus = this.normalizeReviewStatus(rawReviewStatus);

    return {
      id: run.id,
      agentId: run.agentId,
      companyId: run.companyId,
      campaignId: run.campaignId,
      status: run.status as AgentRunStatus,
      currentStepKey: run.currentStepKey,
      inputPayload: run.inputPayload as Record<string, unknown>,
      outputPayload: run.outputPayload as Record<string, unknown>,
      errorMessage: run.errorMessage,
      pauseReason: run.pauseReason,
      pauseFormSchema: run.pauseFormSchema,
      reviewStatus,
      creditCost: run.creditCost ? Number(run.creditCost) : null,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  }

  private normalizeReviewStatus(
    status: string | null,
  ): 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EDITED' | null {
    if (!status) return null;
    if (status === 'PENDING') return 'PENDING_REVIEW';
    if (
      status === 'PENDING_REVIEW' ||
      status === 'APPROVED' ||
      status === 'REJECTED' ||
      status === 'EDITED'
    ) {
      return status;
    }
    return null;
  }

  private mapStepToDto(step: {
    id: string;
    stepKey: string;
    stepIndex: number;
    status: string;
    resultType: string | null;
    inputPayload: unknown;
    outputPayload: unknown;
    errorMessage: string | null;
    llmModel: string | null;
    tokensInput: number | null;
    tokensOutput: number | null;
    creditCost: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
  }): AgentRunStepDto {
    return {
      id: step.id,
      stepKey: step.stepKey,
      stepIndex: step.stepIndex,
      status: step.status as AgentRunStepDto['status'],
      resultType: step.resultType as AgentRunStepDto['resultType'],
      inputPayload: step.inputPayload as Record<string, unknown>,
      outputPayload: step.outputPayload as Record<string, unknown>,
      errorMessage: step.errorMessage,
      llmModel: step.llmModel,
      tokensInput: step.tokensInput,
      tokensOutput: step.tokensOutput,
      creditCost: step.creditCost ? Number(step.creditCost) : null,
      startedAt: step.startedAt?.toISOString() ?? null,
      completedAt: step.completedAt?.toISOString() ?? null,
    };
  }
}
