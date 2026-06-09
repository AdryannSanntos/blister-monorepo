import type { EventPublisher, RunEventPayload } from './kernel';
import type { AgentSseService } from './agent-sse.service';

/**
 * Bridges kernel run events straight into the in-process SSE pub/sub when the
 * agent runs inline (same process as the API). No HTTP round-trip, no APP_URL
 * dependency — used for local/dev execution. Production keeps using the
 * Trigger.dev worker + HttpEventPublisher.
 */
export class InProcessEventPublisher implements EventPublisher {
  constructor(private readonly sse: AgentSseService) {}

  async publish(event: RunEventPayload): Promise<void> {
    this.sse.emit(event.runId, event.companyId, event.type, event.data);
  }
}
