import type { RunEventPayload } from './types';

export interface EventPublisher {
  publish(event: RunEventPayload): Promise<void>;
}

export class HttpEventPublisher implements EventPublisher {
  constructor(
    private readonly baseUrl: string,
    private readonly secretKey?: string,
  ) {}

  async publish(event: RunEventPayload): Promise<void> {
    const url = `${this.baseUrl}/api/internal/agent-runs/${event.runId}/events`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.secretKey) {
        headers['X-Trigger-Secret'] = this.secretKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: event.type,
          data: event.data,
          timestamp: event.timestamp.toISOString(),
        }),
      });

      if (!response.ok) {
        console.error(`Failed to publish event: ${response.status}`);
      }
    } catch (error) {
      console.error('Event publish error:', error);
    }
  }
}

export class NoOpEventPublisher implements EventPublisher {
  private events: RunEventPayload[] = [];

  async publish(event: RunEventPayload): Promise<void> {
    this.events.push(event);
  }

  getEvents(): RunEventPayload[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

export function createRunStartedEvent(
  runId: string,
  agentId: string,
  companyId: string,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'run_started',
    data: {},
    timestamp: new Date(),
  };
}

export function createStepStartedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  stepKey: string,
  stepIndex: number,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'step_started',
    data: { stepKey, stepIndex },
    timestamp: new Date(),
  };
}

export function createStepCompletedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  stepKey: string,
  stepIndex: number,
  output: Record<string, unknown>,
  creditCost: number,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'step_completed',
    data: { stepKey, stepIndex, output, creditCost },
    timestamp: new Date(),
  };
}

export function createRunCompletedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  outputPayload: Record<string, unknown>,
  totalCreditCost: number,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'run_completed',
    data: { outputPayload, totalCreditCost },
    timestamp: new Date(),
  };
}

export function createRunFailedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  errorMessage: string,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'run_failed',
    data: { errorMessage },
    timestamp: new Date(),
  };
}

export function createStepFailedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  stepKey: string,
  error: string,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'step_failed',
    data: { stepKey, error },
    timestamp: new Date(),
  };
}

export function createOutputChunkEvent(
  runId: string,
  agentId: string,
  companyId: string,
  chunk: string,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'output_chunk',
    data: { chunk },
    timestamp: new Date(),
  };
}

export function createRunPausedEvent(
  runId: string,
  agentId: string,
  companyId: string,
  pauseReason: string,
  pauseFormSchema?: Record<string, unknown>,
  inputPayload?: Record<string, unknown>,
): RunEventPayload {
  return {
    runId,
    agentId,
    companyId,
    type: 'run_paused',
    data: { pauseReason, pauseFormSchema, inputPayload },
    timestamp: new Date(),
  };
}
