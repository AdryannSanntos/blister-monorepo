import type {
  ApproveAgentRunDto,
  EditAgentRunOutputDto,
  RegenerateAgentRunDto,
  RejectAgentRunDto,
  ReviewStatus,
} from '@company-os/types';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RagEventsService } from '../../rag/rag-events.service';
import { AgentRegistryService } from './agent-registry.service';
import { WorkflowEngineService } from './workflow-engine.service';

export interface ReviewResult {
  runId: string;
  reviewStatus: ReviewStatus;
  newRunId?: string;
}

@Injectable()
export class AgentRunReviewService {
  private readonly logger = new Logger(AgentRunReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: AgentRegistryService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly ragEvents: RagEventsService,
  ) {}

  async approve(runId: string, userId: string, dto: ApproveAgentRunDto): Promise<ReviewResult> {
    const run = await this.getCompletedRun(runId);

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        outputPayload: {
          ...(run.outputPayload as Record<string, unknown>),
          reviewStatus: 'APPROVED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: userId,
          reviewReason: dto.reason,
        },
      },
    });

    await this.audit.write({
      actorUserId: userId,
      action: 'agent_run.approve',
      resourceType: 'AgentRun',
      resourceId: runId,
      metadata: { reason: dto.reason },
    });

    await this.triggerLearningIndex(run, 'APPROVED', dto.reason);

    this.logger.log(`Approved run: ${runId}`);

    return {
      runId,
      reviewStatus: 'APPROVED',
    };
  }

  async reject(runId: string, userId: string, dto: RejectAgentRunDto): Promise<ReviewResult> {
    const run = await this.getCompletedRun(runId);

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        outputPayload: {
          ...(run.outputPayload as Record<string, unknown>),
          reviewStatus: 'REJECTED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: userId,
          reviewReason: dto.reason,
        },
      },
    });

    await this.audit.write({
      actorUserId: userId,
      action: 'agent_run.reject',
      resourceType: 'AgentRun',
      resourceId: runId,
      metadata: { reason: dto.reason },
    });

    await this.triggerLearningIndex(run, 'REJECTED', dto.reason);

    this.logger.log(`Rejected run: ${runId}`);

    return {
      runId,
      reviewStatus: 'REJECTED',
    };
  }

  async editOutput(
    runId: string,
    userId: string,
    dto: EditAgentRunOutputDto,
  ): Promise<ReviewResult> {
    const run = await this.getCompletedRun(runId);
    const agent = this.registry.get(run.agentId);

    if (agent?.reviewSchema) {
      const parsed = agent.reviewSchema.safeParse(dto.editedOutput);
      if (!parsed.success) {
        throw new BadRequestException(`Invalid edited output: ${parsed.error.message}`);
      }
    }

    const originalOutput = run.outputPayload as Record<string, unknown>;
    const mergedOutput = {
      ...originalOutput,
      ...dto.editedOutput,
      reviewStatus: 'EDITED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: userId,
      reviewReason: dto.reason,
      _originalOutput: JSON.stringify(originalOutput),
    };

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { outputPayload: JSON.parse(JSON.stringify(mergedOutput)) },
    });

    await this.audit.write({
      actorUserId: userId,
      action: 'agent_run.edit',
      resourceType: 'AgentRun',
      resourceId: runId,
      metadata: {
        reason: dto.reason,
        editedFields: Object.keys(dto.editedOutput),
      },
    });

    await this.triggerLearningIndex({ ...run, outputPayload: mergedOutput }, 'EDITED', dto.reason);

    this.logger.log(`Edited run output: ${runId}`);

    return {
      runId,
      reviewStatus: 'EDITED',
    };
  }

  async regenerate(
    runId: string,
    userId: string,
    dto: RegenerateAgentRunDto,
  ): Promise<ReviewResult> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    const inputPayload = run.inputPayload as { userInput?: string };
    const userInput = dto.userInput ?? inputPayload.userInput ?? '';

    const result = await this.workflowEngine.startRun({
      agentId: run.agentId,
      companyId: run.companyId ?? undefined,
      personalSpaceId: run.personalSpaceId ?? undefined,
      userId,
      userInput: dto.instruction
        ? `${userInput}\n\nInstrução adicional: ${dto.instruction}`
        : userInput,
      campaignId: run.campaignId ?? undefined,
      metadata: {
        regeneratedFrom: runId,
        instruction: dto.instruction,
      },
    });

    await this.prisma.agentRun.update({
      where: { id: result.runId },
      data: { parentRunId: runId },
    });

    await this.audit.write({
      actorUserId: userId,
      action: 'agent_run.regenerate',
      resourceType: 'AgentRun',
      resourceId: runId,
      metadata: {
        newRunId: result.runId,
        instruction: dto.instruction,
      },
    });

    this.logger.log(`Regenerated run ${runId} -> ${result.runId}`);

    return {
      runId,
      reviewStatus: 'PENDING_REVIEW',
      newRunId: result.runId,
    };
  }

  private async getCompletedRun(runId: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    if (run.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed runs');
    }

    return run;
  }

  private async triggerLearningIndex(
    run: {
      id: string;
      companyId: string | null;
      agentId: string;
      outputPayload: unknown;
    },
    status: 'APPROVED' | 'REJECTED' | 'EDITED',
    feedback?: string,
  ): Promise<void> {
    // RAG learning index is company-scoped; personal-space runs have no index.
    if (!run.companyId) return;

    try {
      await this.ragEvents.triggerAgentLearningIndex(
        run.companyId,
        run.id,
        run.agentId,
        status === 'APPROVED' || status === 'EDITED',
        run.outputPayload as Record<string, unknown>,
        feedback,
      );
    } catch (error) {
      this.logger.error('Failed to trigger learning index', error);
    }
  }
}
