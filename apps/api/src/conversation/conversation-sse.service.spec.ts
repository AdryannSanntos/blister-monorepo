import type { StoredConversationEvent } from './conversation-event-store.service';
import { ConversationSseService, SSE_HEADERS, type SseSink } from './conversation-sse.service';

const storedEvent = (
  overrides: Partial<StoredConversationEvent> = {},
): StoredConversationEvent => ({
  id: 'evt_1',
  organizationId: 'org1',
  threadId: 'thr1',
  messageId: 'msg1',
  sequence: 1,
  eventType: 'message_text_delta',
  status: null,
  payload: { delta: 'oi' },
  idempotencyKey: null,
  createdAt: new Date(),
  ...overrides,
});

class RecordingSink implements SseSink {
  chunks: string[] = [];
  flushes = 0;
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  flush() {
    this.flushes += 1;
  }
  get output() {
    return this.chunks.join('');
  }
}

describe('ConversationSseService.serializeFrame', () => {
  const sse = new ConversationSseService();

  it('emits a spec-compliant frame with event, id and data lines', () => {
    const frame = sse.serializeFrame({
      eventType: 'message_text_delta',
      threadId: 'thr1',
      messageId: 'msg1',
      sequence: 7,
      payload: { delta: 'oi' },
    });
    expect(frame).toBe(
      `event: message_text_delta\nid: 7\ndata: {"threadId":"thr1","messageId":"msg1","sequence":7,"payload":{"delta":"oi"}}\n\n`,
    );
  });

  it('uses the sequence as the SSE id so clients can resume via Last-Event-ID', () => {
    const frame = sse.serializeFrame({
      eventType: 'message_completed',
      threadId: 't',
      messageId: 'm',
      sequence: 42,
      payload: {},
    });
    expect(frame).toContain('\nid: 42\n');
  });

  it('keeps data on a single line even when the payload contains newlines (no frame corruption)', () => {
    const frame = sse.serializeFrame({
      eventType: 'message_text_snapshot',
      threadId: 't',
      messageId: 'm',
      sequence: 1,
      payload: { text: 'linha1\nlinha2' },
    });
    const lines = frame.split('\n');
    // Exactly: event line, id line, data line, then the blank-line terminator (two trailing \n => two empty entries).
    const dataLines = lines.filter((l) => l.startsWith('data:'));
    expect(dataLines).toHaveLength(1);
    expect(dataLines[0]).toContain('linha1\\nlinha2');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('defaults a missing payload to an empty object', () => {
    const frame = sse.serializeFrame({
      eventType: 'message_stream_started',
      threadId: 't',
      messageId: 'm',
      sequence: 1,
      payload: undefined,
    });
    expect(frame).toContain('"payload":{}');
  });
});

describe('ConversationSseService writing + replay', () => {
  const sse = new ConversationSseService();

  it('writes a stored event and flushes the sink', () => {
    const sink = new RecordingSink();
    sse.writeEvent(
      sink,
      storedEvent({ sequence: 3, eventType: 'message_text_delta', payload: { delta: 'x' } }),
    );
    expect(sink.output).toContain('event: message_text_delta');
    expect(sink.output).toContain('id: 3');
    expect(sink.flushes).toBe(1);
  });

  it('replays only events newer than the resume point, preserving order', () => {
    const sink = new RecordingSink();
    const events = [
      storedEvent({ sequence: 1 }),
      storedEvent({ sequence: 2 }),
      storedEvent({ sequence: 3 }),
      storedEvent({ sequence: 4 }),
    ];
    sse.replayEvents(sink, events, 2);
    const ids = sink.chunks.map((c) => /id: (\d+)/.exec(c)?.[1]);
    expect(ids).toEqual(['3', '4']);
  });

  it('replays everything when no resume point is given', () => {
    const sink = new RecordingSink();
    sse.replayEvents(sink, [storedEvent({ sequence: 1 }), storedEvent({ sequence: 2 })]);
    expect(sink.chunks).toHaveLength(2);
  });

  it('exposes headers that disable caching and proxy buffering', () => {
    expect(SSE_HEADERS['Content-Type']).toContain('text/event-stream');
    expect(SSE_HEADERS['Cache-Control']).toContain('no-cache');
    expect(SSE_HEADERS['X-Accel-Buffering']).toBe('no');
  });
});
