import type { AgentRunEventType } from '@company-os/types';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AgentSseService } from './runtime/agent-sse.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';

const eventPayloadSchema = z.object({
  type: z.enum([
    'run_started',
    'step_started',
    'step_completed',
    'run_completed',
    'run_failed',
    'run_paused',
    'step_failed',
    'output_chunk',
  ]),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

const cutRenderedBodySchema = z.object({
  cutId: z.string().min(1),
  cutFileId: z.string().min(1),
  runFolderId: z.string().min(1),
});

@Controller('internal/agent-runs')
export class InternalEventsController {
  private readonly triggerSecret: string;
  private readonly internalSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sseService: AgentSseService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    this.triggerSecret = this.config.get<string>('TRIGGER_SECRET_KEY') ?? '';
    this.internalSecret = this.config.get<string>('INTERNAL_SECRET') ?? this.triggerSecret;
  }

  @Post(':runId/events')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  async receiveEvent(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Headers('x-trigger-secret') secret?: string,
  ) {
    if (this.triggerSecret && secret !== this.triggerSecret) {
      throw new UnauthorizedException('Invalid trigger secret');
    }

    const payload = eventPayloadSchema.parse(body);

    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: { companyId: true, personalSpaceId: true },
    });

    if (!run) {
      return { received: false, error: 'Run not found' };
    }

    this.emitEvent(
      runId,
      run.companyId ?? run.personalSpaceId ?? '',
      payload.type as AgentRunEventType,
      payload.data,
    );

    return { received: true, runId, type: payload.type };
  }

  @Post('cuts/cut-rendered/:runId')
  @Public()
  @HttpCode(HttpStatus.OK)
  async cutRendered(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Headers('x-internal-secret') secret?: string,
  ): Promise<{ ok: boolean }> {
    if (this.internalSecret && secret !== this.internalSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    const payload = cutRenderedBodySchema.parse(body);

    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: { companyId: true, personalSpaceId: true, status: true },
    });

    if (!run) return { ok: false };
    if (run.status === 'FAILED' || run.status === 'CANCELLED') return { ok: false };

    const scopeId = run.companyId ?? run.personalSpaceId ?? '';

    const updatedStep = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AgentRunStep" WHERE "agentRunId" = ${runId} AND "stepKey" = 'dispatch_renders' AND status = 'COMPLETED' FOR UPDATE`;

      const step = await tx.agentRunStep.findFirst({
        where: { agentRunId: runId, stepKey: 'dispatch_renders', status: 'COMPLETED' },
      });

      if (!step) return null;

      const output = step.outputPayload as {
        totalCuts: number;
        renderedCount: number;
        cuts: Array<{ id: string; cutFileId?: string; [key: string]: unknown }>;
        [key: string]: unknown;
      };

      const updatedCuts = output.cuts.map((cut) =>
        cut.id === payload.cutId ? { ...cut, cutFileId: payload.cutFileId } : cut,
      );

      const renderedCount = output.renderedCount + 1;

      await tx.agentRunStep.update({
        where: { id: step.id },
        data: {
          outputPayload: JSON.parse(
            JSON.stringify({ ...output, renderedCount, cuts: updatedCuts }),
          ),
        },
      });

      return { totalCuts: output.totalCuts, renderedCount };
    });

    if (!updatedStep) return { ok: false };

    const { totalCuts, renderedCount } = updatedStep;

    this.sseService.emitCutRendered(runId, scopeId, {
      cutId: payload.cutId,
      cutFileId: payload.cutFileId,
      renderedCount,
      totalCuts,
    });

    if (renderedCount >= totalCuts) {
      this.sseService.emitAllCutsRendered(runId, scopeId);
      await this.workflowEngine.resumeRun({ runId });
    }

    return { ok: true };
  }

  private emitEvent(
    runId: string,
    companyId: string,
    type: AgentRunEventType,
    data?: Record<string, unknown>,
  ): void {
    switch (type) {
      case 'run_started':
        this.sseService.emitRunStarted(runId, companyId, (data?.agentId as string) ?? '');
        break;
      case 'step_started':
        this.sseService.emitStepStarted(
          runId,
          companyId,
          (data?.stepKey as string) ?? '',
          (data?.stepIndex as number) ?? 0,
        );
        break;
      case 'step_completed':
        this.sseService.emitStepCompleted(
          runId,
          companyId,
          (data?.stepKey as string) ?? '',
          (data?.output as Record<string, unknown>) ?? {},
        );
        break;
      case 'step_failed':
        this.sseService.emitStepFailed(
          runId,
          companyId,
          (data?.stepKey as string) ?? '',
          (data?.error as string) ?? '',
        );
        break;
      case 'run_completed':
        this.sseService.emitRunCompleted(
          runId,
          companyId,
          (data?.outputPayload as Record<string, unknown>) ?? {},
          typeof data?.totalCreditCost === 'number' ? data.totalCreditCost : undefined,
        );
        break;
      case 'run_failed':
        this.sseService.emitRunFailed(runId, companyId, (data?.errorMessage as string) ?? '');
        break;
      case 'run_paused':
        this.sseService.emitRunPaused(
          runId,
          companyId,
          (data?.pauseReason as string) ?? '',
          data?.pauseFormSchema,
          typeof data?.inputPayload === 'object' && data?.inputPayload !== null
            ? (data.inputPayload as Record<string, unknown>)
            : undefined,
          typeof data?.outputPayload === 'object' && data?.outputPayload !== null
            ? (data.outputPayload as Record<string, unknown>)
            : undefined,
        );
        break;
      case 'output_chunk':
        this.sseService.emitOutputChunk(runId, companyId, (data?.chunk as string) ?? '');
        break;
    }
  }
}
