import type { AgentRunBlockDto } from '@company-os/types';
import { toRuntimeDefinition } from '../core/agent-registry';
import type {
  CustomStepExecutor,
  ExecutionKernelDeps,
} from '../core/agent-runtime-types';
import { executeRun } from '../core/execute-run';
import type {
  AnyStepExecutor,
  BrandProfile,
  BuiltAgent,
  ContextPack,
  ImageProvider,
  LlmProvider,
  StepExecutionContext,
  StepExecutor,
  StepResult,
  StepRuntimeDeps,
} from '../core/types';
import type { RunSnapshot } from '../observability/run-snapshot';
import type { RunEventPayload } from '../stream';
import { createCollectingUsageReporter, type UsageEvent } from '../usage/usage-reporter';
import {
  createCollectingEventPublisher,
  createInMemoryBlockStore,
  createInMemoryContextPackBuilder,
  createInMemoryRunStore,
  createStubCreditReporter,
  createStubImageProvider,
  createStubLlmProvider,
  createStubLlmProviderRuntime,
  requeueForResume,
  type InMemoryRunStore,
} from './stubs';

export type AgentRunStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface HarnessStepResult {
  stepKey: string;
  output: Record<string, unknown>;
  status: string;
}

export interface HarnessRunResult {
  status: AgentRunStatus;
  output?: Record<string, unknown>;
  steps: HarnessStepResult[];
  blocks: AgentRunBlockDto[];
  events: RunEventPayload[];
  usage: UsageEvent[];
  creditCost: number;
  pauseReason?: string;
  pauseFormSchema?: Record<string, unknown>;
  errorMessage?: string;
  snapshot?: RunSnapshot;
}

const EMPTY_PACK: ContextPack = { chunks: [], totalFound: 0 };

const invokeRaw = (
  executor: AnyStepExecutor,
  context: StepExecutionContext,
  deps: StepRuntimeDeps,
): Promise<StepResult> => {
  if (executor.length >= 2) return (executor as StepExecutor)(context, deps);
  return (executor as (c: StepExecutionContext) => Promise<StepResult>)(context);
};

let runCounter = 0;

export class AgentTestHarness {
  private readonly agent: BuiltAgent;
  private llmResponses: Record<string, unknown> = {};
  private brandProfile: BrandProfile | null = null;
  private contextPack: ContextPack = EMPTY_PACK;
  private imageProvider: ImageProvider = createStubImageProvider();
  private store?: InMemoryRunStore;
  private pendingResumeData?: Record<string, unknown>;
  private lastSnapshot?: RunSnapshot;

  private constructor(agent: BuiltAgent) {
    this.agent = agent;
  }

  static forAgent(agent: BuiltAgent): AgentTestHarness {
    return new AgentTestHarness(agent);
  }

  withLlmResponses(responses: Record<string, unknown>): this {
    this.llmResponses = responses;
    return this;
  }

  withContext(options: { brandProfile?: BrandProfile | null; contextPack?: ContextPack }): this {
    if (options.brandProfile !== undefined) this.brandProfile = options.brandProfile;
    if (options.contextPack) this.contextPack = options.contextPack;
    return this;
  }

  withImageProvider(provider: ImageProvider): this {
    this.imageProvider = provider;
    return this;
  }

  /** Wraps each SDK step into a runtime executor with a per-step LLM stub. */
  private buildStepExecutors(): Record<string, CustomStepExecutor> {
    const executors: Record<string, CustomStepExecutor> = {};
    const agentId = this.agent.definition.agentId;

    for (const [stepKey, rawStep] of Object.entries(this.agent.steps)) {
      const llm: LlmProvider = createStubLlmProvider(this.llmResponses[stepKey]);
      executors[`${agentId}:${stepKey}`] = async (context, deps) =>
        invokeRaw(rawStep, context, {
          llmProvider: llm,
          imageProvider: this.imageProvider,
          assetResolver: deps.assetResolver,
          message: deps.message,
        });
    }

    return executors;
  }

  private buildDeps(events: ReturnType<typeof createCollectingEventPublisher>, blocks: ReturnType<typeof createInMemoryBlockStore>, usage: ReturnType<typeof createCollectingUsageReporter>): ExecutionKernelDeps {
    return {
      runStore: this.store as InMemoryRunStore,
      loadAgentDefinition: async () => toRuntimeDefinition(this.agent),
      contextPackBuilder: createInMemoryContextPackBuilder(this.contextPack),
      llmProvider: createStubLlmProviderRuntime({}),
      imageProvider: {
        generateImage: async () => ({
          imageUrl: 'https://example.com/generated-image.png',
          storageKey: 'stub/generated-image.png',
        }),
      },
      eventPublisher: events,
      blocks,
      usageReporter: createStubCreditReporter(),
      assetResolver: null,
      customStepExecutors: this.buildStepExecutors(),
      usage,
      telemetry: {
        onSnapshot: (snapshot) => {
          this.lastSnapshot = snapshot;
        },
      },
    };
  }

  private toResult(
    events: ReturnType<typeof createCollectingEventPublisher>,
    blocks: ReturnType<typeof createInMemoryBlockStore>,
    usage: ReturnType<typeof createCollectingUsageReporter>,
  ): HarnessRunResult {
    const run = (this.store as InMemoryRunStore).current();
    const pausedEvent = [...events.events].reverse().find((e) => e.type === 'run_paused');

    return {
      status: run.status as AgentRunStatus,
      output: run.status === 'COMPLETED' ? run.outputPayload : undefined,
      steps: run.steps.map((step) => ({
        stepKey: step.stepKey,
        output: step.outputPayload,
        status: step.status,
      })),
      blocks: blocks.blocks,
      events: events.events,
      usage: usage.events,
      creditCost: run.creditCost,
      pauseReason: run.status === 'PAUSED' ? (pausedEvent?.data.pauseReason as string) : undefined,
      pauseFormSchema:
        run.status === 'PAUSED'
          ? (pausedEvent?.data.pauseFormSchema as Record<string, unknown> | undefined)
          : undefined,
      errorMessage: run.errorMessage ?? undefined,
      snapshot: this.lastSnapshot,
    };
  }

  private async execute(formData?: Record<string, unknown>): Promise<HarnessRunResult> {
    const events = createCollectingEventPublisher();
    const blocks = createInMemoryBlockStore();
    const usage = createCollectingUsageReporter();
    const deps = this.buildDeps(events, blocks, usage);

    await executeRun(deps, { runId: (this.store as InMemoryRunStore).current().id, formData });
    return this.toResult(events, blocks, usage);
  }

  async run(input?: Record<string, unknown>): Promise<HarnessRunResult> {
    if (input && !this.store) {
      this.store = createInMemoryRunStore({
        runId: `harness_run_${runCounter++}`,
        agentId: this.agent.definition.agentId,
        companyId: 'harness_company',
        inputPayload: input,
        brandProfile: this.brandProfile,
      });
      return this.execute();
    }

    if (!this.store) {
      throw new Error('AgentTestHarness.run requires an input on first call');
    }

    const formData = this.pendingResumeData;
    this.pendingResumeData = undefined;
    requeueForResume(this.store);
    return this.execute(formData);
  }

  async runUntilPaused(input: Record<string, unknown>): Promise<HarnessRunResult> {
    return this.run(input);
  }

  resume(formData: Record<string, unknown>): this {
    this.pendingResumeData = formData;
    return this;
  }
}
