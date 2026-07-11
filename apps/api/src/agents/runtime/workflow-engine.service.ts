import type { AgentRunStatus } from '@company-os/types';

import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { tasks } from '@trigger.dev/sdk';

import type { agentRunExecute } from '../../../trigger/agent-run-execute';

import { PrismaService } from '../../prisma/prisma.service';

import { AgentRegistryService } from './agent-registry.service';

import type { RunWorkspaceScope } from './agent-run.service';

import { AgentSseService } from './agent-sse.service';

import { CreditStepInterceptor } from './credit-step.interceptor';

import { resolveAgentExecutionMode } from './agent-execution-mode';

import {

  assertCutsLiveProviders,

  warnApiBaseUrl,

  warnTriggerAppUrl,

} from './agent-provider-guards';

import { devAgentLogger } from './dev-agent-logger';

import { remapLegacyCarouselStepKey } from '../carousel/utils/carousel-legacy-resume.util';



type AgentRunExecuteTask = typeof agentRunExecute;



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

export class WorkflowEngineService implements OnModuleInit {

  private readonly logger = new Logger(WorkflowEngineService.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly registry: AgentRegistryService,

    private readonly creditInterceptor: CreditStepInterceptor,

    private readonly sseService: AgentSseService,

    private readonly config: ConfigService,

  ) {}



  onModuleInit(): void {

    const mode = this.resolveExecutionMode();

    warnTriggerAppUrl(

      mode,

      this.config.get<string>('APP_URL'),

      this.config.get<string>('PORT') ?? '3001',

      (message) => this.logger.warn(message),

    );

    warnApiBaseUrl(

      mode,

      this.config.get<string>('API_BASE_URL'),

      this.config.get<string>('PORT') ?? '3001',

      (message) => this.logger.warn(message),

    );
  }

  private resolveExecutionMode() {

    return resolveAgentExecutionMode(this.config.get<string>('AGENT_EXECUTION_MODE'));

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



    devAgentLogger.log('Starting agent run', {

      agentId: options.agentId,

      userId: options.userId,

      companyId: options.companyId,

      personalSpaceId: options.personalSpaceId,

      inputLength: options.userInput.length,

    });



    const mode = this.resolveExecutionMode();



    if (options.agentId === 'cuts') {

      assertCutsLiveProviders(mode);

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

        agentVersion: agent.version,

        status: 'QUEUED',

        inputPayload: JSON.parse(JSON.stringify(parsed.data)),

        outputPayload: {},

      },

    });



    this.logger.debug(`Created agent run: ${run.id}`);

    devAgentLogger.log('Agent run queued', { runId: run.id, agentId: options.agentId });



    try {

      const handle = await tasks.trigger<AgentRunExecuteTask>('agent-run-execute', {

        runId: run.id,

      });



      this.logger.debug(`Triggered execution: ${handle.id}`);

      devAgentLogger.log('Trigger task dispatched', {

        runId: run.id,

        triggerHandleId: handle.id,

      });



      return {

        runId: run.id,

        status: 'QUEUED',

      };

    } catch (error) {

      devAgentLogger.error('Failed to trigger agent run', error, { runId: run.id });



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

      throw new NotFoundException(`Run not found: ${options.runId}`);

    }



    if (run.status !== 'PAUSED') {

      if (run.status === 'QUEUED' || run.status === 'RUNNING' || run.status === 'COMPLETED') {

        devAgentLogger.log('Resume skipped — run already in progress or finished', {

          runId: options.runId,

          status: run.status,

        });



        return {

          runId: run.id,

          status: run.status,

        };

      }



      throw new ConflictException(`Run cannot be resumed while ${run.status}`);

    }



    devAgentLogger.log('Resuming agent run', {

      runId: options.runId,

      agentId: run.agentId,

      resumeFromStep: run.currentStepKey,

      hasFormData: Boolean(options.formData && Object.keys(options.formData).length > 0),

    });



    const mode = this.resolveExecutionMode();



    if (run.agentId === 'cuts') {

      assertCutsLiveProviders(mode);

    }



    const mergedInput =

      options.formData && Object.keys(options.formData).length > 0

        ? {

            ...(run.inputPayload as Record<string, unknown>),

            ...options.formData,

          }

        : (run.inputPayload as Record<string, unknown>);



    const legacyTarget =
      run.agentId === 'carousel' && run.currentStepKey
        ? remapLegacyCarouselStepKey(run.currentStepKey)
        : null;

    const resumeFromStep = legacyTarget ?? run.currentStepKey ?? undefined;



    await this.prisma.agentRun.update({

      where: { id: run.id },

      data: {

        status: 'QUEUED',

        pauseReason: null,

        pauseFormSchema: undefined,

        inputPayload: JSON.parse(JSON.stringify(mergedInput)),

      },

    });



    try {

      const handle = await tasks.trigger<AgentRunExecuteTask>('agent-run-execute', {

        runId: run.id,

        resumeFromStep,

        formData: options.formData,

      });



      this.logger.debug(`Resumed execution: ${handle.id}`);

      devAgentLogger.log('Resume trigger dispatched', {

        runId: run.id,

        triggerHandleId: handle.id,

        resumeFromStep,

      });



      return {

        runId: run.id,

        status: 'QUEUED',

      };

    } catch (error) {

      devAgentLogger.error('Failed to resume agent run', error, { runId: run.id });



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



    this.logger.debug(`Cancelled run: ${runId}`);



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


