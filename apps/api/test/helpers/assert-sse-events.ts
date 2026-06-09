import type { AgentRunEventType } from '@company-os/types';

export interface CollectedSseEvent {
  type: AgentRunEventType;
  data: Record<string, unknown>;
  receivedAt: Date;
}

export class SseEventCollector {
  private events: CollectedSseEvent[] = [];
  private eventSource: EventSource | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly cookies: string[],
  ) {}

  async connect(runId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/api/agents/runs/${runId}/stream`;

      if (typeof EventSource === 'undefined') {
        this.mockConnect(runId);
        resolve();
        return;
      }

      this.eventSource = new EventSource(url, {
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        resolve();
      };

      this.eventSource.onerror = (error) => {
        reject(error);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: AgentRunEventType;
            [key: string]: unknown;
          };
          this.events.push({
            type: data.type,
            data,
            receivedAt: new Date(),
          });
        } catch {
          // Ignore parse errors
        }
      };
    });
  }

  private mockConnect(_runId: string): void {
    // Mock implementation for Node.js environment
  }

  addEvent(type: AgentRunEventType, data: Record<string, unknown>): void {
    this.events.push({
      type,
      data,
      receivedAt: new Date(),
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  getEvents(): CollectedSseEvent[] {
    return [...this.events];
  }

  getEventsByType(type: AgentRunEventType): CollectedSseEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events = [];
  }

  async waitForEvent(
    type: AgentRunEventType,
    timeoutMs = 30000,
  ): Promise<CollectedSseEvent> {
    const startTime = Date.now();
    const pollInterval = 100;

    while (Date.now() - startTime < timeoutMs) {
      const matching = this.events.find((e) => e.type === type);
      if (matching) {
        return matching;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for SSE event: ${type}`);
  }
}

export interface SseEventSequenceAssertion {
  expectedSequence: AgentRunEventType[];
  allowExtraEvents?: boolean;
}

export function assertSseEventSequence(
  events: CollectedSseEvent[],
  assertion: SseEventSequenceAssertion,
): void {
  const eventTypes = events.map((e) => e.type);

  if (assertion.allowExtraEvents) {
    let lastIndex = -1;
    for (const expectedType of assertion.expectedSequence) {
      const foundIndex = eventTypes.indexOf(expectedType, lastIndex + 1);
      if (foundIndex === -1) {
        throw new Error(
          `Missing expected event in sequence: ${expectedType}. ` +
            `Received: [${eventTypes.join(', ')}]`,
        );
      }
      lastIndex = foundIndex;
    }
  } else {
    if (eventTypes.length !== assertion.expectedSequence.length) {
      throw new Error(
        `Event count mismatch: expected ${assertion.expectedSequence.length}, ` +
          `got ${eventTypes.length}. Received: [${eventTypes.join(', ')}]`,
      );
    }

    for (let i = 0; i < assertion.expectedSequence.length; i++) {
      if (eventTypes[i] !== assertion.expectedSequence[i]) {
        throw new Error(
          `Event sequence mismatch at index ${i}: ` +
            `expected ${assertion.expectedSequence[i]}, got ${eventTypes[i]}. ` +
            `Received: [${eventTypes.join(', ')}]`,
        );
      }
    }
  }
}

export function assertRunCompletedEvent(
  events: CollectedSseEvent[],
  expectedRunId: string,
): void {
  const completedEvent = events.find((e) => e.type === 'run_completed');
  if (!completedEvent) {
    throw new Error('No run_completed event found');
  }

  if (completedEvent.data.runId !== expectedRunId) {
    throw new Error(
      `run_completed event has wrong runId: expected ${expectedRunId}, ` +
        `got ${completedEvent.data.runId}`,
    );
  }
}

export function assertStepEventsMatch(
  events: CollectedSseEvent[],
  expectedStepCount: number,
): void {
  const stepStarted = events.filter((e) => e.type === 'step_started');
  const stepCompleted = events.filter((e) => e.type === 'step_completed');

  if (stepStarted.length !== expectedStepCount) {
    throw new Error(
      `step_started count mismatch: expected ${expectedStepCount}, got ${stepStarted.length}`,
    );
  }

  if (stepCompleted.length !== expectedStepCount) {
    throw new Error(
      `step_completed count mismatch: expected ${expectedStepCount}, got ${stepCompleted.length}`,
    );
  }
}
