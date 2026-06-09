import type { Prisma } from '../../../generated/prisma';

export type AgentRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type StepResultType = 'CONTINUE' | 'PAUSED' | 'FAILED' | 'COMPLETE';

export interface StepDefinition {
  key: string;
  label: string;
  type: 'preparation' | 'llm_call' | 'validation' | 'output' | 'image_generation';
  config?: Record<string, unknown>;
}

export interface AgentDefinition {
  agentId: string;
  label: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  steps: StepDefinition[];
  capabilities: string[];
}

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
  palette: Prisma.JsonValue;
  typography: string | null;
  socialNetworks: string[];
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

export interface RunResult {
  runId: string;
  status: AgentRunStatus;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  pauseReason?: string;
  creditCost: number;
}

export interface RunEventPayload {
  runId: string;
  agentId: string;
  companyId: string;
  type: 'run_started' | 'step_started' | 'step_completed' | 'run_completed' | 'run_failed' | 'run_paused';
  data: Record<string, unknown>;
  timestamp: Date;
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

export type StepExecutor = (context: StepExecutionContext) => Promise<StepResult>;
