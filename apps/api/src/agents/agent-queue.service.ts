import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RUNNING_RUNS_PER_ORGANIZATION = 3;
const RUN_LEASE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AgentQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRunningCount(organizationId: string) {
    return this.prisma.agentRun.count({
      where: {
        organizationId,
        status: 'running',
      },
    });
  }

  async requeueStaleRunningRuns(organizationId: string) {
    const cutoff = new Date(Date.now() - RUN_LEASE_TTL_MS);

    await this.prisma.agentRun.updateMany({
      where: {
        organizationId,
        status: 'running',
        leaseExpiresAt: { lt: cutoff },
      },
      data: {
        status: 'queued',
        processingLeaseId: null,
        leaseExpiresAt: null,
      },
    });
  }

  async promoteRun(runId: string, organizationId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.agentRun.updateMany({
          where: {
            organizationId,
            status: 'running',
            leaseExpiresAt: { lt: new Date(Date.now() - RUN_LEASE_TTL_MS) },
          },
          data: {
            status: 'queued',
            processingLeaseId: null,
            leaseExpiresAt: null,
          },
        });

        const runningCount = await tx.agentRun.count({
          where: {
            organizationId,
            status: 'running',
          },
        });

        if (runningCount >= MAX_RUNNING_RUNS_PER_ORGANIZATION) {
          return null;
        }

        const promoted = await tx.agentRun.updateMany({
          where: {
            id: runId,
            organizationId,
            status: 'queued',
          },
          data: {
            status: 'running',
            queuePosition: null,
            startedAt: new Date(),
            completedAt: null,
            lastAttemptAt: new Date(),
            leaseExpiresAt: null,
            errorMessage: null,
            attemptCount: { increment: 1 },
          },
        });

        if (promoted.count === 0) {
          return null;
        }

        return tx.agentRun.findUnique({ where: { id: runId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async promoteNextQueuedRun(organizationId: string) {
    const nextQueuedRun = await this.prisma.agentRun.findFirst({
      where: {
        organizationId,
        status: 'queued',
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if (!nextQueuedRun) {
      return null;
    }

    return this.promoteRun(nextQueuedRun.id, organizationId);
  }

  async markRunCompleted(runId: string, status: 'success' | 'error' | 'awaiting_user_validation') {
    return this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        queuePosition: null,
        leaseExpiresAt: null,
      },
    });
  }

  async createAttemptStep(runId: string, attemptNumber: number) {
    return this.prisma.agentRunStep.create({
      data: {
        runId,
        blockKey: `attempt-${attemptNumber}`,
        blockType: 'attempt',
        status: 'running',
        metadata: {
          attemptNumber,
        },
        inputPayload: {},
        outputPayload: {},
        startedAt: new Date(),
      },
    });
  }

  async completeAttemptStep(stepId: string, status: 'success' | 'error', errorMessage?: string) {
    return this.prisma.agentRunStep.update({
      where: { id: stepId },
      data: {
        status,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async claimProcessingLease(runId: string, leaseId: string) {
    const claim = await this.prisma.agentRun.updateMany({
      where: {
        id: runId,
        status: 'running',
        processingLeaseId: null,
      },
      data: {
        processingLeaseId: leaseId,
        leaseExpiresAt: new Date(Date.now() + RUN_LEASE_TTL_MS),
      },
    });

    return claim.count === 1;
  }

  async releaseProcessingLease(runId: string) {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        processingLeaseId: null,
        leaseExpiresAt: null,
      },
    });
  }
}
