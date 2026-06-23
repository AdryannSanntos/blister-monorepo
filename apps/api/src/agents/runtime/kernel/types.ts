import type { Prisma } from '@company-os/db';

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

export interface RunResult {
  runId: string;
  status: AgentRunStatus;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  pauseReason?: string;
  creditCost: number;
}

export type { RunEventPayload } from '@company-os/agent-ia-sdk/agents';

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
