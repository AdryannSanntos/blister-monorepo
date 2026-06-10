import type { RunSnapshot } from './run-snapshot';

export interface RunStartedTelemetry {
  runId: string;
  agentId: string;
  companyId: string;
}

export interface StepCompletedTelemetry {
  runId: string;
  agentId: string;
  stepKey: string;
  status: string;
  tokensInput?: number;
  tokensOutput?: number;
  creditCost?: number;
  durationMs?: number;
}

export interface RunFinishedTelemetry {
  runId: string;
  agentId: string;
  status: string;
  creditCost: number;
}

/**
 * Optional observability sink. The runtime calls these hooks; the app decides
 * whether to log, emit metrics, or persist the {@link RunSnapshot}.
 */
export interface TelemetryProvider {
  onRunStarted?(event: RunStartedTelemetry): void | Promise<void>;
  onStepCompleted?(event: StepCompletedTelemetry): void | Promise<void>;
  onRunFinished?(event: RunFinishedTelemetry): void | Promise<void>;
  onSnapshot?(snapshot: RunSnapshot): void | Promise<void>;
}

export const createNoOpTelemetryProvider = (): TelemetryProvider => ({});
