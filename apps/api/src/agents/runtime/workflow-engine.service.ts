import type { AgentRunStatus } from '@company-os/types';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tasks } from '@trigger.dev/sdk';
import type { agentRunExecute } from '../../../trigger/agent-run-execute';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyRagSyncService } from '../../rag/company-rag-sync.service';
import { StorageService } from '../../storage/storage.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentSseService } from './agent-sse.service';
import { CreditStepInterceptor } from './credit-step.interceptor';
import { InProcessEventPublisher } from './in-process-event.publisher';
import {
  type ExecutionDependencies,
  createTriggerImageProvider,
  createTriggerLlmProvider,
  executeRun,
} from './kernel';
import type { AssetResolver } from './kernel';
import { StepContextFactory } from './step-context.factory';

type AgentRunExecuteTask = typeof agentRunExecute;

type ExecutionMode = 'inline-stub' | 'inline-live' | 'trigger';

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
    private readonly companyRagSync: CompanyRagSyncService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolves brand asset storage keys to signed download URLs for the post
   * generator. Failures are swallowed per key so one missing asset never breaks
   * a run.
   */
  private buildAssetResolver(): AssetResolver {
    return async (storageKeys) => {
      const entries = await Promise.all(
        storageKeys.map(async (key): Promise<[string, string] | null> => {
          try {
            const url = await this.storage.getPresignedDownloadUrl(key);
            return [key, url];
          } catch (error) {
            this.logger.warn(
              `Failed to resolve asset ${key}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return null;
          }
        }),
      );

      return Object.fromEntries(
        entries.filter((entry): entry is [string, string] => entry !== null),
      );
    };
  }

  /**
   * inline-* runs the agent kernel inside this process (no Trigger.dev worker
   * required) and streams events straight to SSE. Defaults to inline in dev so
   * the chat works out of the box; production defaults to the Trigger.dev
   * worker. Override with AGENT_EXECUTION_MODE.
   */
  private resolveExecutionMode(): ExecutionMode {
    const mode = this.config.get<string>('AGENT_EXECUTION_MODE');
    if (mode === 'inline-stub' || mode === 'inline-live' || mode === 'trigger') {
      return mode;
    }
    return this.config.get<string>('NODE_ENV') === 'production' ? 'trigger' : 'inline-live';
  }

  private startInlineExecution(
    mode: ExecutionMode,
    params: { runId: string; resumeFromStep?: string; formData?: Record<string, unknown> },
  ): void {
    const stubMode = mode === 'inline-stub';
    const deps: ExecutionDependencies = {
      prisma: this.prisma,
      contextPackBuilder: null,
      llmProvider: stubMode ? null : createTriggerLlmProvider(this.prisma),
      imageProvider: stubMode ? null : createTriggerImageProvider(this.prisma),
      assetResolver: stubMode ? null : this.buildAssetResolver(),
      eventPublisher: new InProcessEventPublisher(this.sseService),
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

    await this.creditInterceptor.checkBalance(options.companyId, agent.estimatedCreditCost ?? 0.01);

    await this.companyRagSync.ensureSynced(options.companyId, {
      campaignId: options.campaignId,
    });

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
      outputPayload:
        run.status === 'COMPLETED' ? (run.outputPayload as Record<string, unknown>) : undefined,
      errorMessage: run.errorMessage ?? undefined,
      pauseReason: run.pauseReason ?? undefined,
    };
  }
}
