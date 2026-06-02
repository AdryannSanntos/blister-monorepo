import {
  appendConversationEventInputSchema,
  conversationEventSchema,
  conversationSseFrameSchema,
} from './conversation-event.dto';

describe('conversationEventSchema', () => {
  it('accepts a well-formed event for every event type', () => {
    const validByType: Array<{ eventType: string; payload: unknown }> = [
      { eventType: 'message_created', payload: { role: 'assistant' } },
      { eventType: 'message_stream_started', payload: {} },
      { eventType: 'message_text_delta', payload: { delta: 'Ola' } },
      { eventType: 'message_text_snapshot', payload: { text: 'Ola mundo' } },
      { eventType: 'message_completed', payload: { text: 'final', citations: [] } },
      { eventType: 'message_failed', payload: { errorMessage: 'LLM timeout' } },
      {
        eventType: 'tool_group_started',
        payload: { groupId: 'g1', label: 'Pesquisando contexto' },
      },
      {
        eventType: 'tool_started',
        payload: { toolCallId: 't1', toolName: 'rag_search', input: { query: 'x' } },
      },
      { eventType: 'tool_progress', payload: { toolCallId: 't1', progress: 0.5 } },
      { eventType: 'tool_completed', payload: { toolCallId: 't1', output: { summary: 'ok' } } },
      { eventType: 'tool_failed', payload: { toolCallId: 't1', errorMessage: 'boom' } },
      {
        eventType: 'citations_emitted',
        payload: { citations: [{ label: 'Brain', sourceType: 'brain_entry' }] },
      },
      { eventType: 'context_search_started', payload: { toolCallId: 't1', query: 'empresa' } },
      { eventType: 'context_search_completed', payload: { toolCallId: 't1', resultCount: 3 } },
      { eventType: 'file_search_started', payload: { toolCallId: 't2', query: 'arquivo' } },
      { eventType: 'file_search_completed', payload: { toolCallId: 't2', resultCount: 0 } },
      { eventType: 'web_research_started', payload: { toolCallId: 't3', query: 'noticia' } },
      { eventType: 'web_research_completed', payload: { toolCallId: 't3', resultCount: 5 } },
    ];

    for (const candidate of validByType) {
      const result = conversationEventSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    }
  });

  it('applies defaults so downstream projection never reads undefined', () => {
    const parsed = conversationEventSchema.parse({
      eventType: 'tool_started',
      payload: { toolCallId: 't1', toolName: 'rag_search' },
    });
    if (parsed.eventType !== 'tool_started') throw new Error('discriminator narrowing failed');
    expect(parsed.payload.input).toEqual({});
    expect(parsed.payload.displayOrder).toBe(0);
  });

  it('rejects a text delta with an empty string (would render nothing and waste a row)', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'message_text_delta',
      payload: { delta: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a text delta missing its delta field', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'message_text_delta',
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects any tool lifecycle event without a toolCallId', () => {
    for (const eventType of ['tool_started', 'tool_progress', 'tool_completed', 'tool_failed']) {
      const result = conversationEventSchema.safeParse({
        eventType,
        payload: { toolName: 'rag_search', output: {}, errorMessage: 'x' },
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects citations_emitted with an empty citation list', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'citations_emitted',
      payload: { citations: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a citation without a label', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'citations_emitted',
      payload: { citations: [{ sourceType: 'brain_entry' }] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a mismatched discriminator/payload pair (snapshot payload on a delta event)', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'message_text_delta',
      payload: { text: 'this belongs to a snapshot, not a delta' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown event type', () => {
    const result = conversationEventSchema.safeParse({
      eventType: 'message_exploded',
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a tool_progress with progress out of the 0..1 range', () => {
    expect(
      conversationEventSchema.safeParse({
        eventType: 'tool_progress',
        payload: { toolCallId: 't1', progress: 1.5 },
      }).success,
    ).toBe(false);
  });
});

describe('appendConversationEventInputSchema', () => {
  it('requires organization, thread and message scoping alongside the event', () => {
    const result = appendConversationEventInputSchema.safeParse({
      organizationId: 'org_1',
      threadId: 'thr_1',
      messageId: 'msg_1',
      eventType: 'message_text_snapshot',
      payload: { text: 'oi' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an append missing organizationId (org-scoping is mandatory)', () => {
    const result = appendConversationEventInputSchema.safeParse({
      threadId: 'thr_1',
      messageId: 'msg_1',
      eventType: 'message_text_snapshot',
      payload: { text: 'oi' },
    });
    expect(result.success).toBe(false);
  });

  it('still enforces the event payload contract when appending', () => {
    const result = appendConversationEventInputSchema.safeParse({
      organizationId: 'org_1',
      threadId: 'thr_1',
      messageId: 'msg_1',
      eventType: 'message_text_delta',
      payload: { delta: '' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts an optional idempotencyKey for retried appends', () => {
    const result = appendConversationEventInputSchema.safeParse({
      organizationId: 'org_1',
      threadId: 'thr_1',
      messageId: 'msg_1',
      idempotencyKey: 'evt-abc',
      eventType: 'message_completed',
      payload: { text: 'final' },
    });
    expect(result.success).toBe(true);
  });
});

describe('conversationSseFrameSchema', () => {
  it('accepts a frame carrying thread/message/sequence for resumable streaming', () => {
    const result = conversationSseFrameSchema.safeParse({
      event: 'message_text_delta',
      id: 'evt_1',
      threadId: 'thr_1',
      messageId: 'msg_1',
      sequence: 7,
      data: { delta: 'oi' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative sequence (sequences are monotonic and non-negative)', () => {
    const result = conversationSseFrameSchema.safeParse({
      event: 'message_text_delta',
      id: 'evt_1',
      threadId: 'thr_1',
      messageId: 'msg_1',
      sequence: -1,
      data: { delta: 'oi' },
    });
    expect(result.success).toBe(false);
  });
});
