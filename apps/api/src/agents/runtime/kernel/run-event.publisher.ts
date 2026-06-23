import type { RunEventPayload } from '@company-os/agent-ia-sdk/agents';
import {
  type EventPublisher,
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPausedEvent,
  createRunStartedEvent,
} from '@company-os/agent-ia-sdk/agents';
import { devAgentLogger } from '../dev-agent-logger';

export type { EventPublisher, RunEventPayload };

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
        devAgentLogger.error('Failed to publish agent event', undefined, {
          runId: event.runId,
          type: event.type,
          status: response.status,
        });
      }
    } catch (error) {
      devAgentLogger.error('Event publish error', error, {
        runId: event.runId,
        type: event.type,
      });
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

export {
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPausedEvent,
  createRunStartedEvent,
};
