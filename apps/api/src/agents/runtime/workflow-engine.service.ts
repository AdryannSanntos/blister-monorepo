import type { AgentRunStatus } from '@company-os/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tasks } from '@trigger.dev/sdk';
import type { agentRunExecute } from '../../../trigger/agent-run-execute';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRunBlockService } from './agent-run-block.service';
import type { RunWorkspaceScope } from './agent-run.service';
import { AgentSseService } from './agent-sse.service';
import { CreditStepInterceptor } from './credit-step.interceptor';
import { InProcessEventPublisher } from './in-process-event.publisher';
import {
  type ExecutionDependencies,
  createTriggerLlmProvider,
  executeRun,
} from './kernel';
import { resolveAgentExecutionMode } from './agent-execution-mode';

type AgentRunExecuteTask = typeof agentRunExecute;

type ExecutionMode = 'inline-stub' | 'inline-live' | 'trigger';

export interface StartRunOptions {
  agentId: string;
  /** Company-scoped run. Mutually exclusive with personalSpaceId. */
  companyId?: string;
  /** Personal-space-scoped run. Mutually exclusive with companyId. */
  personalSpaceId?: string;
  userId: string;
  userInput: string;
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
    private readonly creditInterceptor: CreditStepInterceptor,
    private readonly sseService: AgentSseService,
    private readonly config: ConfigService,
    private readonly agentRunBlockService: AgentRunBlockService,
  ) {}

  /**
   * inline-* runs the agent kernel inside this process (no Trigger.dev worker
   * required) and streams events straight to SSE. Defaults to inline in dev so
   * the chat works out of the box; production defaults to the Trigger.dev
   * worker. Override with AGENT_EXECUTION_MODE.
   */
  private resolveExecutionMode(): ExecutionMode {
    return resolveAgentExecutionMode(
      this.config.get<string>('AGENT_EXECUTION_MODE'),
      this.config.get<string>('NODE_ENV'),
    );
  }

  private startInlineExecution(
    mode: ExecutionMode,
    params: { runId: string; resumeFromStep?: string; formData?: Record<string, unknown> },
  ): void {
    const stubMode = mode === 'inline-stub';
    const deps: ExecutionDependencies = {
      prisma: this.prisma,
      llmProvider: stubMode ? null : createTriggerLlmProvider(this.prisma),
      imageProvider: null,
      eventPublisher: new InProcessEventPublisher(this.sseService),
      blocks: this.agentRunBlockService,
      stubMode,
    };

    // Fire-and-forget: the HTTP request returns QUEUED immediately while the run
    // executes in the background. Buffered SSE events cover the connection gap.
    void executeRun(deps, params).catch((error) => {
      this.logger.error(
        `Inline execution failed for run ${params.runId}`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

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

    const isPersonal = Boolean(options.personalSpaceId) && !options.companyId;

    if (isPersonal) {
      await this.creditInterceptor.checkPersonalBalance(
        options.personalSpaceId as string,
        agent.estimatedCreditCost ?? 0.01,
      );
    } else {
      await this.creditInterceptor.checkBalance(
        options.companyId as string,
        agent.estimatedCreditCost ?? 0.01,
      );
    }

    const run = await this.prisma.agentRun.create({
      data: {
        companyId: options.companyId ?? null,
        personalSpaceId: options.personalSpaceId ?? null,
        agentId: options.agentId,
        // Persist the agent version with the run for traceability/reproducibility.
        agentVersion: agent.version,
        status: 'QUEUED',
        inputPayload: JSON.parse(JSON.stringify(parsed.data)),
        outputPayload: {},
      },
    });

    this.logger.log(`Created agent run: ${run.id}`);

    const mode = this.resolveExecutionMode();

    if (mode !== 'trigger') {
      this.startInlineExecution(mode, { runId: run.id });
      return { runId: run.id, status: 'QUEUED' };
    }

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

    // Persist onboarding answers before returning so GET /runs/:id and the chat
    // thread can render Q&A history immediately. executeRun also merges formData,
    // but that runs async — a refetch right after resume used to win the race
    // with stale inputPayload and made the UI look stuck.
    const mergedInput =
      options.formData && Object.keys(options.formData).length > 0
        ? {
            ...(run.inputPayload as Record<string, unknown>),
            ...options.formData,
          }
        : (run.inputPayload as Record<string, unknown>);

    await this.prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'QUEUED',
        pauseReason: null,
        pauseFormSchema: undefined,
        inputPayload: JSON.parse(JSON.stringify(mergedInput)),
      },
    });

    const mode = this.resolveExecutionMode();

    if (mode !== 'trigger') {
      this.startInlineExecution(mode, {
        runId: run.id,
        resumeFromStep: run.currentStepKey ?? undefined,
        formData: options.formData,
      });
      return { runId: run.id, status: 'QUEUED' };
    }

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

  async cancelRun(runId: string, scope: RunWorkspaceScope): Promise<RunResult> {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, ...scope },
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

    this.sseService.emitRunCancelled(
      runId,
      run.companyId ?? run.personalSpaceId ?? '',
      run.agentId,
    );

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
      outputPayload:
        run.status === 'COMPLETED' ? (run.outputPayload as Record<string, unknown>) : undefined,
      errorMessage: run.errorMessage ?? undefined,
      pauseReason: run.pauseReason ?? undefined,
    };
  }
}
