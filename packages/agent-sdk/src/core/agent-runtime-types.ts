import type { AgentMiddleware } from '../middleware/types';
import type { RoutingRule } from '../routing/routing';
import type { TelemetryProvider } from '../observability/telemetry';
import type { UsageReporter as UsageSdkReporterImpl } from '../usage/usage-reporter';
import type {
  AgentRunBlockServiceLike,
  EventPublisher,
  MessageHandle,
  StreamingBlock,
} from '../stream';
import type { CheckpointStore } from './checkpoint';
import type { RunStore } from './run-store';
import type { StepExecutionContext, StepResult } from './types';

export interface AgentStepDefinitionRuntime {
  key: string;
  label: string;
  type: 'preparation' | 'clarification' | 'llm_call' | 'validation' | 'output' | 'image_generation';
  config?: Record<string, unknown>;
}

export interface AgentDefinitionRuntime {
  agentId: string;
  version?: string;
  label: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  steps: AgentStepDefinitionRuntime[];
  capabilities: string[];
  skills?: string[];
  middleware?: AgentMiddleware;
  routing?: RoutingRule[];
}

export interface LlmCompletion {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  structuredOutput?: Record<string, unknown>;
}

export interface LlmCompletionParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  agentId: string;
  stepKey?: string;
  maxTokens?: number;
  temperature?: number;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface LlmProviderRuntime {
  complete(params: LlmCompletionParams): Promise<LlmCompletion>;
  completeStream?(
    params: LlmCompletionParams,
    onChunk: (delta: string) => void,
  ): Promise<LlmCompletion>;
}

export interface ImageProviderRuntime {
  generateImage(params: {
    prompt: string;
    agentId: string;
    stepKey?: string;
  }): Promise<{
    imageUrl?: string;
    base64?: string;
    storageKey?: string;
  }>;
}

export interface StepExecutorRuntimeDeps {
  llmProvider: LlmProviderRuntime | null;
  imageProvider: ImageProviderRuntime | null;
  message: MessageHandle;
}

export type CustomStepExecutor = (
  context: StepExecutionContext,
  deps: StepExecutorRuntimeDeps,
  onChunk?: (delta: string) => void,
) => Promise<StepResult>;

export interface CreateStepContextParams {
  runId: string;
  agentId: string;
  companyId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
}

export interface PlatformSettings {
  markupDefault: number;
  minRunCost: number;
}

export interface CreditDebitResult {
  success: boolean;
  debitedAmount: number;
  newBalance: number;
  ledgerEntryId?: string;
  error?: string;
}

export interface UsageReporter {
  getPlatformSettings(): Promise<PlatformSettings>;
  debitStep(params: {
    companyId: string;
    agentRunId: string;
    agentRunStepId: string;
    stepKey: string;
    baseCost: number;
    markupMultiplier: number;
    minRunCost: number;
  }): Promise<CreditDebitResult>;
}

export interface ExecutionKernelDeps {
  runStore: RunStore;
  loadAgentDefinition: (agentId: string) => Promise<AgentDefinitionRuntime | null>;
  llmProvider: LlmProviderRuntime | null;
  imageProvider: ImageProviderRuntime | null;
  eventPublisher: EventPublisher;
  blocks: AgentRunBlockServiceLike;
  usageReporter: UsageReporter;
  customStepExecutors: Record<string, CustomStepExecutor>;
  stubMode?: boolean;
  formatProviderError?: (error: unknown) => string;
  /** Optional raw-usage reporter (tokens/cost). Separate from credit debiting. */
  usage?: UsageSdkReporter | null;
  telemetry?: TelemetryProvider | null;
  checkpointStore?: CheckpointStore | null;
}

/** Raw-usage reporter (tokens/cost); the billing `UsageReporter` keeps its name. */
export type UsageSdkReporter = UsageSdkReporterImpl;

export interface ExecuteRunParams {
  runId: string;
  resumeFromStep?: string;
  formData?: Record<string, unknown>;
}

export interface KernelRunResult {
  runId: string;
  status: import('./run-store').AgentRunStatus;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  pauseReason?: string;
  creditCost: number;
}

export type { MessageHandle, StreamingBlock };
