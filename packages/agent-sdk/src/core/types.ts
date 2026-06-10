import type { AgentMiddleware } from '../middleware/types';
import type { RoutingRule } from '../routing/routing';
import type { ToolRegistry } from '../tools/tool-registry';
import type { LearningHandler } from '../learning/learning-registry';
import type { MessageHandle } from '../stream/block-emitter';

export type StepResultType = 'CONTINUE' | 'PAUSED' | 'FAILED' | 'COMPLETE';

export interface ContextChunk {
  id: string;
  content: string;
  sourceType: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface ContextPack {
  chunks: ContextChunk[];
  totalFound: number;
  brandContext?: string;
  learningContext?: string;
  campaignContext?: string;
}

export interface BrandProfile {
  id: string;
  companyId: string;
  brandVoice: string | null;
  niche: string | null;
  description: string | null;
  targetAudience: string | null;
  marketingObjective: string | null;
  mainProducts: string | null;
  differentiators: string | null;
  visualStyle: string | null;
  palette: unknown;
  typography: string | null;
  socialNetworks: string[];
  logoStorageKey: string | null;
  logoVariants: unknown;
  brandAssets: unknown;
}

export interface StepExecutionContext {
  runId: string;
  agentId: string;
  companyId: string;
  campaignId: string | null;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
  contextPack: ContextPack;
  brandProfile: BrandProfile | null;
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

export type AssetResolver = (storageKeys: string[]) => Promise<Record<string, string>>;

export interface StepRuntimeDeps {
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  assetResolver: AssetResolver | null;
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

export interface AgentContextConfig {
  includeBrandBrain?: boolean;
  includeAgentLearning?: boolean;
  includeCampaignContext?: boolean;
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
  context?: AgentContextConfig;
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
