import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AgentExecutionService } from './agent-execution.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

@Injectable()
export class AgentRunResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentExecutionService: AgentExecutionService,
  ) {}

  async answerSuspension(
    organizationId: string,
    runId: string,
    suspensionId: string,
    userId: string,
    answers: Record<string, unknown>,
  ) {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, organizationId },
    });

    if (!run) throw new NotFoundException('Agent run not found');

    const suspension = await this.prisma.agentRunSuspension.findFirst({
      where: { id: suspensionId, runId, status: 'pending' },
      include: { step: true },
    });

    if (!suspension) throw new NotFoundException('Suspension not found or already answered');
    if (!suspension.step) {
      throw new BadRequestException('Suspension is not linked to a step and cannot be resumed');
    }

    const existingResponses = await this.prisma.agentRunSuspensionResponse.count({
      where: { suspensionId },
    });

    // Materialize answers as the suspended block's output, so the runtime resumes
    // from the next downstream node treating the suspension as already executed.
    const resolvedOutputs: Record<string, unknown> = {
      default: { answers, suspensionType: suspension.type },
      answers,
    };

    await this.prisma.$transaction([
      this.prisma.agentRunSuspensionResponse.create({
        data: {
          suspensionId,
          answers: toJsonValue(answers),
          roundNumber: existingResponses + 1,
          answeredById: userId,
        },
      }),
      this.prisma.agentRunSuspension.update({
        where: { id: suspensionId },
        data: { status: 'answered', answeredAt: new Date() },
      }),
      this.prisma.agentRunStep.update({
        where: { id: suspension.step.id },
        data: {
          status: 'success',
          outputPayload: toJsonValue(resolvedOutputs),
          outputType: suspension.step.blockType,
          completedAt: new Date(),
        },
      }),
      this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          currentBlockId: null,
          currentBlockType: null,
          waitingReason: null,
          resumeStatus: 'ready_to_resume',
          status: 'queued',
          processingLeaseId: null,
          leaseExpiresAt: null,
        },
      }),
    ]);

    // Re-enqueue the run so processRun picks it up and the runtime can rehydrate
    // its state from prior successful steps.
    try {
      await this.agentExecutionService.enqueueRun({
        organizationId,
        agentRunId: runId,
        agentId: run.agentId,
        agentVersionId: run.agentVersionId,
      });
    } catch (error) {
      // Roll forward by leaving the run queued; a subsequent retry or queue
      // promotion will pick it up. Surface the original error for observability.
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          processingMetadata: toJsonValue({
            resumeError: error instanceof Error ? error.message : 'failed to enqueue resume',
          }),
        },
      });
    }

    return this.prisma.agentRun.findUnique({ where: { id: runId } });
  }

  async listSuspensions(organizationId: string, runId: string) {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, organizationId },
    });
    if (!run) throw new NotFoundException('Agent run not found');

    return this.prisma.agentRunSuspension.findMany({
      where: { runId },
      include: { responses: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
