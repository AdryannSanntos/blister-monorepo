import { Injectable, Logger } from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk';
import type { agentRunExecute } from '../../../trigger/agent-run-execute';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentRegistryService } from './agent-registry.service';
import { StepContextFactory } from './step-context.factory';
import { CreditStepInterceptor } from './credit-step.interceptor';
import { AgentSseService } from './agent-sse.service';
import { CompanyRagSyncService } from '../../rag/company-rag-sync.service';
import type { AgentRunStatus } from '@company-os/types';

type AgentRunExecuteTask = typeof agentRunExecute;

export interface StartRunOptions {
  agentId: string;
  companyId: string;
  userId: string;
  userInput: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
}

export interface ResumeRunOptions {
  runId: string;
  formData?: Record<string, unknown>;
}

export interface RunResult {
  runId: string;
  status: AgentRunStatus;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  pauseReason?: string;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AgentRegistryService,
    private readonly stepContextFactory: StepContextFactory,
    private readonly creditInterceptor: CreditStepInterceptor,
    private readonly sseService: AgentSseService,
  ) {}

  async startRun(options: StartRunOptions): Promise<RunResult> {
    const agent = this.registry.getOrThrow(options.agentId);

    if (!agent.isEnabled) {
      throw new Error(`Agent ${options.agentId} is disabled`);
    }

    const parsed = agent.inputSchema.safeParse({
      userInput: options.userInput,
      ...options.metadata,
    });

    if (!parsed.success) {
      throw new Error(`Invalid input: ${parsed.error.message}`);
    }

    await this.creditInterceptor.checkBalance(
      options.companyId,
      agent.estimatedCreditCost ?? 0.01,
    );

    const run = await this.prisma.agentRun.create({
      data: {
        companyId: options.companyId,
        agentId: options.agentId,
        campaignId: options.campaignId,
        status: 'QUEUED',
        inputPayload: JSON.parse(JSON.stringify(parsed.data)),
        outputPayload: {},
      },
    });

    this.logger.log(`Created agent run: ${run.id}`);

    try {
      const handle = await tasks.trigger<AgentRunExecuteTask>('agent-run-execute', {
        runId: run.id,
      });

      this.logger.log(`Triggered execution: ${handle.id}`);

      return {
        runId: run.id,
        status: 'QUEUED',
      };
    } catch (error) {
      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Failed to start execution',
        },
      });

      throw error;
    }
  }

  async resumeRun(options: ResumeRunOptions): Promise<RunResult> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: options.runId },
    });

    if (!run) {
      throw new Error(`Run not found: ${options.runId}`);
    }

    if (run.status !== 'PAUSED') {
      throw new Error(`Run is not paused: ${run.status}`);
    }

    await this.prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'QUEUED' },
    });

    try {
      const handle = await tasks.trigger<AgentRunExecuteTask>('agent-run-execute', {
        runId: run.id,
        resumeFromStep: run.currentStepKey ?? undefined,
        formData: options.formData,
      });

      this.logger.log(`Resumed execution: ${handle.id}`);

      return {
        runId: run.id,
        status: 'QUEUED',
      };
    } catch (error) {
      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Failed to resume execution',
        },
      });

      throw error;
    }
  }

  async cancelRun(runId: string): Promise<RunResult> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
      throw new Error(`Run is already in terminal state: ${run.status}`);
    }

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Cancelled run: ${runId}`);

    return {
      runId,
      status: 'CANCELLED',
    };
  }

  async getRunStatus(runId: string): Promise<RunResult> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    return {
      runId: run.id,
      status: run.status as AgentRunStatus,
      outputPayload: run.status === 'COMPLETED' ? (run.outputPayload as Record<string, unknown>) : undefined,
      errorMessage: run.errorMessage ?? undefined,
      pauseReason: run.pauseReason ?? undefined,
    };
  }
}
