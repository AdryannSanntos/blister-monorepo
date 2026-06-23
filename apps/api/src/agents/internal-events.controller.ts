import { agentRunEventTypeSchema, type AgentRunEventType } from '@company-os/types';
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
import { devAgentLogger } from './runtime/dev-agent-logger';
import {
  logCutsDev,
  summarizeRenderProgress,
  warnCutsDev,
} from './cuts/cuts-dev-logger';
import { WorkflowEngineService } from './runtime/workflow-engine.service';

const eventPayloadSchema = z.object({
  type: agentRunEventTypeSchema,
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
      devAgentLogger.warn('Internal event for unknown run', { runId, type: payload.type });
      return { received: false, error: 'Run not found' };
    }

    devAgentLogger.log('Internal event received', {
      runId,
      type: payload.type,
      dataKeys: payload.data ? Object.keys(payload.data) : [],
    });

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

    logCutsDev('await_renders', 'Cut rendered callback received', {
      runId,
      cutId: payload.cutId,
      cutFileId: payload.cutFileId,
      runFolderId: payload.runFolderId,
    });

    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: { companyId: true, personalSpaceId: true, status: true },
    });

    if (!run) {
      warnCutsDev('await_renders', 'Run not found for cut-rendered callback', { runId });
      return { ok: false };
    }
    if (run.status === 'FAILED' || run.status === 'CANCELLED') {
      warnCutsDev('await_renders', 'Run in terminal state, ignoring callback', {
        runId,
        status: run.status,
      });
      return { ok: false };
    }

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

    if (!updatedStep) {
      warnCutsDev('await_renders', 'dispatch_renders step not found or not completed', { runId });
      return { ok: false };
    }

    const { totalCuts, renderedCount } = updatedStep;

    logCutsDev('await_renders', 'Render progress updated', {
      runId,
      ...summarizeRenderProgress({
        totalCuts,
        renderedCount,
        cutId: payload.cutId,
        cutFileId: payload.cutFileId,
      }),
    });

    this.sseService.emitCutRendered(runId, scopeId, {
      cutId: payload.cutId,
      cutFileId: payload.cutFileId,
      renderedCount,
      totalCuts,
    });

    if (renderedCount >= totalCuts) {
      logCutsDev('await_renders', 'All cuts rendered — resuming run', {
        runId,
        totalCuts,
        renderedCount,
      });

      this.sseService.emitAllCutsRendered(runId, scopeId, { renderedCount, totalCuts });
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
    this.sseService.emit(runId, companyId, type, data);
  }
}
