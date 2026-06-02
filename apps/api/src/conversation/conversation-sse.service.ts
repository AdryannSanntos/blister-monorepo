import { Injectable } from '@nestjs/common';
import type { StoredConversationEvent } from './conversation-event-store.service';

/**
 * Minimal writable sink — the subset of an Express `Response` the SSE writer
 * needs. Keeps the transport testable without spinning up HTTP.
 */
export interface SseSink {
  write(chunk: string): boolean;
  end?: () => void;
  flush?: () => void;
}

export interface SseFrameInput {
  eventType: string;
  threadId: string;
  messageId: string;
  sequence: number;
  payload: unknown;
}

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Disable proxy buffering (nginx) so events flush immediately.
  'X-Accel-Buffering': 'no',
};

/**
 * Generic SSE transport for the conversation domain. Pure framing + a thin writer
 * so any conversational surface can stream the same canonical event contract.
 *
 * The wire frame always carries `event`, `id` (= per-thread `sequence`, which is
 * what a client sends back as `Last-Event-ID` to resume) and a JSON `data` blob
 * embedding `threadId`, `messageId`, `sequence` and the event `payload`.
 */
@Injectable()
export class ConversationSseService {
  /** Serializes one event into a spec-compliant SSE frame string. */
  serializeFrame(input: SseFrameInput): string {
    const data = JSON.stringify({
      threadId: input.threadId,
      messageId: input.messageId,
      sequence: input.sequence,
      payload: input.payload ?? {},
    });
    // `id` enables Last-Event-ID resume; `data` is single-line JSON (no raw
    // newlines), so a single `data:` line is valid and unambiguous.
    return `event: ${input.eventType}\nid: ${input.sequence}\ndata: ${data}\n\n`;
  }

  frameFromStoredEvent(event: StoredConversationEvent): string {
    return this.serializeFrame({
      eventType: event.eventType,
      threadId: event.threadId,
      messageId: event.messageId,
      sequence: event.sequence,
      payload: event.payload,
    });
  }

  /** Heartbeat comment to keep idle connections (and proxies) alive. */
  heartbeat(): string {
    return ': ping\n\n';
  }

  /** Writes one stored event to the sink, flushing eagerly when supported. */
  writeEvent(sink: SseSink, event: StoredConversationEvent): void {
    sink.write(this.frameFromStoredEvent(event));
    sink.flush?.();
  }

  /**
   * Replays already-persisted events newer than `afterSequence` to a freshly
   * (re)connected client, so a reconnect resumes exactly from where it dropped.
   */
  replayEvents(sink: SseSink, events: StoredConversationEvent[], afterSequence?: number): void {
    for (const event of events) {
      if (afterSequence !== undefined && event.sequence <= afterSequence) continue;
      this.writeEvent(sink, event);
    }
  }
}
