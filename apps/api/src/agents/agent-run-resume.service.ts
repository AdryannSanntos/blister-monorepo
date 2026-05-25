import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

@Injectable()
export class AgentRunResumeService {
  constructor(private readonly prisma: PrismaService) {}

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
    });

    if (!suspension) throw new NotFoundException('Suspension not found or already answered');

    const existingResponses = await this.prisma.agentRunSuspensionResponse.count({
      where: { suspensionId },
    });

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
      this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          currentBlockId: null,
          currentBlockType: null,
          waitingReason: null,
          resumeStatus: 'ready_to_resume',
          status: 'queued',
        },
      }),
    ]);

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
