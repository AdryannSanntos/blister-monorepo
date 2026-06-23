import type { AgentMiddleware } from '../middleware/types';
import type { RoutingRule } from '../routing/routing';
import type { ToolRegistry } from '../tools/tool-registry';
import type { LearningHandler } from '../learning/learning-registry';
import type { MessageHandle } from '../stream/block-emitter';

export type StepResultType = 'CONTINUE' | 'PAUSED' | 'FAILED' | 'COMPLETE';

export interface StepExecutionContext {
  runId: string;
  agentId: string;
  companyId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
}

export interface StepResult {
  type: StepResultType;
  output?: Record<string, unknown>;
  error?: string;
  pauseReason?: string;
  pauseFormSchema?: Record<string, unknown>;
  llmModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  creditCost?: number;
}

export interface LlmCompleteParams {
  system: string;
  user: string;
  structuredOutputSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmCompleteResult {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

export interface LlmProvider {
  complete(params: LlmCompleteParams): Promise<LlmCompleteResult>;
  completeStream?(
    params: LlmCompleteParams,
    onChunk: (delta: string) => void,
  ): Promise<LlmCompleteResult>;
}

export interface ImageProvider {
  generate(params: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface StepRuntimeDeps {
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  message?: MessageHandle | null;
}

export type StepExecutor = (
  context: StepExecutionContext,
  deps: StepRuntimeDeps,
) => Promise<StepResult>;

export type LegacyStepExecutor = (context: StepExecutionContext) => Promise<StepResult>;

export type AnyStepExecutor = StepExecutor | LegacyStepExecutor;

export interface AgentStepDefinition {
  key: string;
  label: string;
  type:
    | 'llm_call'
    | 'validation'
    | 'form'
    | 'decision'
    | 'output'
    | 'preparation'
    | 'clarification'
    | 'image_generation';
  config?: Record<string, unknown>;
}

export interface BuiltAgentDefinition {
  agentId: string;
  version?: string;
  label: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  reviewSchema?: Record<string, unknown>;
  capabilities: string[];
  steps: AgentStepDefinition[];
  skills?: string[];
  isEnabled?: boolean;
  estimatedCreditCost?: number;
}

export interface BuiltAgent {
  definition: BuiltAgentDefinition;
  steps: Record<string, AnyStepExecutor>;
  learning?: LearningHandler;
  tools?: ToolRegistry;
  routing?: RoutingRule[];
  middleware?: AgentMiddleware;
}
