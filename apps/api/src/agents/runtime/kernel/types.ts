import type { Prisma } from '../../../generated/prisma';

export type AgentRunStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type StepResultType = 'CONTINUE' | 'PAUSED' | 'FAILED' | 'COMPLETE';

export interface StepDefinition {
  key: string;
  label: string;
  type: 'preparation' | 'clarification' | 'llm_call' | 'validation' | 'output' | 'image_generation';
  config?: Record<string, unknown>;
}

export interface AgentDefinition {
  agentId: string;
  version?: string;
  label: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  steps: StepDefinition[];
  capabilities: string[];
  /** Skill folder ids under `agents/<agentId>/skills/<id>/`. */
  skills?: string[];
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
  /** S3 key of the legacy single logo. */
  logoStorageKey: string | null;
  /** Map of logo variants (primary/horizontal/icon/monochrome) → S3 key. */
  logoVariants: Prisma.JsonValue;
  /** Array of brand assets ({ id, name, storageKey, mimeType, createdAt }). */
  brandAssets: Prisma.JsonValue;
}

/**
 * Resolves a list of S3 storage keys into temporary, signed download URLs.
 * Returns a map keyed by the original storage key. Keys that fail to resolve
 * are simply omitted from the result. Optional dependency — when absent, steps
 * that rely on brand assets degrade gracefully (no `<img>` references emitted).
 */
export type AssetResolver = (storageKeys: string[]) => Promise<Record<string, string>>;

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

export type { RunEventPayload } from '@company-os/agent-sdk';

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
