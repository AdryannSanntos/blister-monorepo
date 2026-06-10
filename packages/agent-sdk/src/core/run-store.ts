import type { BrandProfile, StepResultType } from './types';

export type AgentRunStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface StoredRunStep {
  id: string;
  stepKey: string;
  stepIndex: number;
  status: string;
  outputPayload: Record<string, unknown>;
}

export interface StoredRun {
  id: string;
  agentId: string;
  companyId: string;
  campaignId: string | null;
  status: AgentRunStatus;
  currentStepKey: string | null;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  errorMessage: string | null;
  creditCost: number;
  startedAt: Date | null;
  steps: StoredRunStep[];
  brandProfile: BrandProfile | null;
}

export interface StartStepParams {
  runId: string;
  stepKey: string;
  stepIndex: number;
  existingStepId?: string;
  inputPayload: Record<string, unknown>;
}

export interface CompleteStepParams {
  stepId: string;
  resultType: StepResultType;
  output: Record<string, unknown>;
  error?: string;
  llmModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  creditCost: number;
  failed: boolean;
  /** When true, step stays out of completed-step outputs until resumed. */
  paused?: boolean;
}

export interface PauseRunParams {
  runId: string;
  pauseReason?: string;
  pauseFormSchema?: Record<string, unknown>;
  creditCost: number;
}

export interface FailRunParams {
  runId: string;
  errorMessage: string;
  creditCost: number;
}

export interface CompleteRunParams {
  runId: string;
  outputPayload: Record<string, unknown>;
  creditCost: number;
}

export interface RunStore {
  findRun(runId: string): Promise<StoredRun | null>;
  mergeInputPayload(runId: string, formData: Record<string, unknown>): Promise<StoredRun>;
  getCompletedStepOutputs(runId: string): Promise<Record<string, Record<string, unknown>>>;
  /** Atomically claims a QUEUED run, or allows retry on stale RUNNING (no active step). */
  claimRunForExecution(runId: string, startedAt: Date | null): Promise<StoredRun | null>;
  getRunStatus(runId: string): Promise<AgentRunStatus | null>;
  setRunRunning(runId: string, startedAt: Date | null): Promise<void>;
  setCurrentStepKey(runId: string, stepKey: string): Promise<void>;
  startStep(params: StartStepParams): Promise<{ stepId: string }>;
  completeStep(params: CompleteStepParams): Promise<void>;
  pauseRun(params: PauseRunParams): Promise<void>;
  failRun(params: FailRunParams): Promise<void>;
  completeRun(params: CompleteRunParams): Promise<void>;
}
