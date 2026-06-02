import { ConversationEventStoreService } from './conversation-event-store.service';
import { ConversationProjectionService } from './conversation-projection.service';
import { ConversationService } from './conversation.service';
import type { AppendConversationEventInput } from './dto/conversation-event.dto';

/**
 * Self-contained in-memory Prisma fake covering the conversation tables, used to
 * exercise the WHOLE module wired together (event store + projection + facade).
 * Enforces the real unique constraints so replay/idempotency behavior is genuine.
 */
function makeFakePrisma() {
  const events: any[] = [];
  const messageProjections: any[] = [];
  const toolProjections: any[] = [];
  let idSeq = 0;

  const matches = (row: any, where: any) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && 'gt' in (v as any)) return row[k] > (v as any).gt;
      return row[k] === v;
    });

  const conversationEvent = {
    findUnique: async ({ where }: any) => {
      const { threadId, idempotencyKey } = where.threadId_idempotencyKey;
      return (
        events.find((r) => r.threadId === threadId && r.idempotencyKey === idempotencyKey) ?? null
      );
    },
    findFirst: async ({ where }: any) =>
      events.filter((r) => matches(r, where)).sort((a, b) => b.sequence - a.sequence)[0] ?? null,
    findMany: async ({ where }: any) =>
      events
        .filter((r) => matches(r, where))
        .sort((a, b) => a.sequence - b.sequence)
        .map((r) => ({ ...r })),
    create: async ({ data }: any) => {
      const row = { id: `evt_${++idSeq}`, createdAt: new Date(), status: null, ...data };
      events.push(row);
      return { ...row };
    },
  };

  const conversationMessageProjection = {
    upsert: async ({ where, create, update }: any) => {
      const existing = messageProjections.find((r) => r.messageId === where.messageId);
      if (existing) Object.assign(existing, update);
      else messageProjections.push({ id: `mp_${++idSeq}`, createdAt: new Date(), ...create });
    },
    findMany: async ({ where }: any) =>
      messageProjections.filter((r) => matches(r, where)).sort((a, b) => a.createdAt - b.createdAt),
  };

  const conversationToolCallProjection = {
    upsert: async ({ where, create, update }: any) => {
      const { messageId, toolCallId } = where.messageId_toolCallId;
      const existing = toolProjections.find(
        (r) => r.messageId === messageId && r.toolCallId === toolCallId,
      );
      if (existing) Object.assign(existing, update);
      else toolProjections.push({ id: `tp_${++idSeq}`, createdAt: new Date(), ...create });
    },
    findMany: async ({ where }: any) =>
      toolProjections
        .filter((r) => matches(r, where))
        .sort((a, b) => a.displayOrder - b.displayOrder),
  };

  const client: any = {
    conversationEvent,
    conversationMessageProjection,
    conversationToolCallProjection,
    $transaction: async (fn: any) => fn(client),
    __tables: { events, messageProjections, toolProjections },
  };
  return client;
}

const input = (overrides: Record<string, unknown>): AppendConversationEventInput =>
  ({
    organizationId: 'org1',
    threadId: 'thr1',
    messageId: 'msg1',
    ...overrides,
  }) as unknown as AppendConversationEventInput;

describe('ConversationService (event store + projection + facade)', () => {
  let prisma: ReturnType<typeof makeFakePrisma>;
  let service: ConversationService;

  beforeEach(() => {
    prisma = makeFakePrisma();
    const store = new ConversationEventStoreService(prisma);
    const projections = new ConversationProjectionService(prisma);
    service = new ConversationService(prisma, store, projections);
  });

  it('appends an event and atomically materializes its projection', async () => {
    const { event, projection } = await service.appendEvent(
      input({ eventType: 'message_text_snapshot', payload: { text: 'ola' } }),
    );
    expect(event.sequence).toBe(1);
    expect(projection.message.text).toBe('ola');
    expect(prisma.__tables.messageProjections).toHaveLength(1);
    expect(prisma.__tables.messageProjections[0].text).toBe('ola');
  });

  it('rebuilds a faithful thread replay from a full streamed turn', async () => {
    await service.appendEvent(
      input({ eventType: 'message_created', payload: { role: 'assistant' } }),
    );
    await service.appendEvent(input({ eventType: 'message_stream_started', payload: {} }));
    await service.appendEvent(
      input({
        eventType: 'tool_group_started',
        payload: { groupId: 'g1', label: 'Pesquisando contexto' },
      }),
    );
    await service.appendEvent(
      input({
        eventType: 'tool_started',
        payload: {
          toolCallId: 't1',
          toolName: 'rag_search',
          groupId: 'g1',
          input: { query: 'empresa' },
        },
      }),
    );
    await service.appendEvent(
      input({
        eventType: 'tool_completed',
        payload: { toolCallId: 't1', output: { summary: 'ok' }, resultCount: 2, durationMs: 90 },
      }),
    );
    await service.appendEvent(
      input({ eventType: 'message_text_delta', payload: { delta: 'A empresa ' } }),
    );
    await service.appendEvent(
      input({ eventType: 'message_text_delta', payload: { delta: 'faz X.' } }),
    );
    await service.appendEvent(
      input({
        eventType: 'message_completed',
        payload: { text: 'A empresa faz X.', citations: [{ label: 'Brain', sourceId: 'b1' }] },
      }),
    );

    const replay = await service.getThreadReplay('org1', 'thr1');
    expect(replay.lastSequence).toBe(8);
    expect(replay.messages).toHaveLength(1);
    const msg = replay.messages[0];
    expect(msg.text).toBe('A empresa faz X.');
    expect(msg.status).toBe('completed');
    expect(msg.isCompleted).toBe(true);
    expect(msg.citations).toEqual([{ label: 'Brain', sourceId: 'b1' }]);
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]).toMatchObject({
      toolCallId: 't1',
      toolName: 'rag_search',
      status: 'completed',
    });
  });

  it('keeps replay reidratavel after a partial failure mid-stream', async () => {
    await service.appendEvent(input({ eventType: 'message_stream_started', payload: {} }));
    await service.appendEvent(
      input({ eventType: 'message_text_delta', payload: { delta: 'comecei a responder' } }),
    );
    await service.appendEvent(
      input({ eventType: 'message_failed', payload: { errorMessage: 'LLM caiu' } }),
    );

    const replay = await service.getThreadReplay('org1', 'thr1');
    const msg = replay.messages[0];
    expect(msg.status).toBe('failed');
    expect(msg.isFailed).toBe(true);
    expect(msg.isStreaming).toBe(false);
    expect(msg.errorMessage).toBe('LLM caiu');
    expect(msg.text).toBe('comecei a responder');
  });

  it('does not duplicate work when the same event is appended twice (idempotency)', async () => {
    const key = 'completed-evt';
    await service.appendEvent(
      input({ eventType: 'message_completed', payload: { text: 'pronto' }, idempotencyKey: key }),
    );
    const second = await service.appendEvent(
      input({ eventType: 'message_completed', payload: { text: 'pronto' }, idempotencyKey: key }),
    );
    expect(prisma.__tables.events).toHaveLength(1);
    expect(second.projection.message.text).toBe('pronto');
    expect(prisma.__tables.messageProjections).toHaveLength(1);
  });

  it('exposes resume + max sequence for SSE reconnection', async () => {
    await service.appendEvent(
      input({ eventType: 'message_created', payload: { role: 'assistant' } }),
    );
    await service.appendEvent(input({ eventType: 'message_text_delta', payload: { delta: 'a' } }));
    await service.appendEvent(input({ eventType: 'message_text_delta', payload: { delta: 'b' } }));

    expect(await service.getMaxSequence('thr1')).toBe(3);
    const since = await service.listEventsSince('thr1', 1);
    expect(since.map((e) => e.sequence)).toEqual([2, 3]);
  });
});
