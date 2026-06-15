import type { AgentRunEventType } from '@company-os/types';

export interface RunEventPayload {
  runId: string;
  agentId: string;
  companyId: string;
  type: AgentRunEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface EventPublisher {
  publish(event: RunEventPayload): Promise<void>;
}

export const createRunStartedEvent = (
  runId: string,
  agentId: string,
  companyId: string,
): RunEventPayload => ({
  runId,
  agentId,
  companyId,
  type: 'run_started',
  data: {},
  timestamp: new Date(),
});

export const createRunCompletedEvent = (
  runId: string,
  agentId: string,
  companyId: string,
  outputPayload: Record<string, unknown>,
  totalCreditCost: number,
): RunEventPayload => ({
  runId,
  agentId,
  companyId,
  type: 'run_completed',
  data: { outputPayload, totalCreditCost },
  timestamp: new Date(),
});

export const createRunFailedEvent = (
  runId: string,
  agentId: string,
  companyId: string,
  errorMessage: string,
): RunEventPayload => ({
  runId,
  agentId,
  companyId,
  type: 'run_failed',
  data: { errorMessage },
  timestamp: new Date(),
});

export const createRunPausedEvent = (
  runId: string,
  agentId: string,
  companyId: string,
  pauseReason: string,
  pauseFormSchema?: Record<string, unknown>,
  inputPayload?: Record<string, unknown>,
  outputPayload?: Record<string, unknown>,
): RunEventPayload => ({
  runId,
  agentId,
  companyId,
  type: 'run_paused',
  data: { pauseReason, pauseFormSchema, inputPayload, outputPayload },
  timestamp: new Date(),
});
