import { Prisma } from '../generated/prisma';
import {
  ConversationEventStoreService,
  type StoredConversationEvent,
} from './conversation-event-store.service';
import type { AppendConversationEventInput } from './dto/conversation-event.dto';

/**
 * Stateful in-memory fake of the `conversationEvent` table that enforces the two
 * unique constraints the real DB enforces — (threadId, sequence) and
 * (threadId, idempotencyKey). This lets the store's monotonicity, idempotency and
 * retry logic be tested against real constraint behavior, not stubbed returns.
 */
class FakeEventTable {
  rows: any[] = [];
  private idSeq = 0;
  failSequenceOnce = false;

  private p2002(target: string) {
    return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: [target] },
    });
  }

  async findUnique({ where }: any) {
    const { threadId, idempotencyKey } = where.threadId_idempotencyKey;
    return (
      this.rows.find((r) => r.threadId === threadId && r.idempotencyKey === idempotencyKey) ?? null
    );
  }

  async findFirst({ where }: any) {
    const rows = this.rows
      .filter((r) => r.threadId === where.threadId)
      .sort((a, b) => b.sequence - a.sequence);
    return rows[0] ?? null;
  }

  async findMany({ where }: any) {
    let rows = this.rows.filter((r) => r.threadId === where.threadId);
    if (where.sequence?.gt !== undefined) rows = rows.filter((r) => r.sequence > where.sequence.gt);
    return rows.sort((a, b) => a.sequence - b.sequence).map((r) => ({ ...r }));
  }

  async create({ data }: any) {
    if (this.failSequenceOnce) {
      this.failSequenceOnce = false;
      throw this.p2002('ConversationEvent_threadId_sequence_key');
    }
    if (this.rows.some((r) => r.threadId === data.threadId && r.sequence === data.sequence)) {
      throw this.p2002('ConversationEvent_threadId_sequence_key');
    }
    if (
      data.idempotencyKey != null &&
      this.rows.some(
        (r) => r.threadId === data.threadId && r.idempotencyKey === data.idempotencyKey,
      )
    ) {
      throw this.p2002('ConversationEvent_threadId_idempotencyKey_key');
    }
    const row = { id: `evt_${++this.idSeq}`, createdAt: new Date(), status: null, ...data };
    this.rows.push(row);
    return { ...row };
  }
}

function makeFakePrisma() {
  const conversationEvent = new FakeEventTable();
  const client: any = {
    conversationEvent,
    $transaction: async (fn: any) => fn(client),
  };
  return client;
}

const baseInput = (overrides: Record<string, unknown>): AppendConversationEventInput =>
  ({
    organizationId: 'org1',
    threadId: 'thr1',
    messageId: 'msg1',
    ...overrides,
  }) as unknown as AppendConversationEventInput;

describe('ConversationEventStoreService', () => {
  let prisma: ReturnType<typeof makeFakePrisma>;
  let store: ConversationEventStoreService;

  beforeEach(() => {
    prisma = makeFakePrisma();
    store = new ConversationEventStoreService(prisma);
  });

  it('allocates strictly monotonic sequences per thread', async () => {
    const a = await store.append(
      baseInput({ eventType: 'message_created', payload: { role: 'assistant' } }),
    );
    const b = await store.append(baseInput({ eventType: 'message_stream_started', payload: {} }));
    const c = await store.append(
      baseInput({ eventType: 'message_text_delta', payload: { delta: 'oi' } }),
    );
    expect([a.sequence, b.sequence, c.sequence]).toEqual([1, 2, 3]);
  });

  it('keeps sequences independent per thread', async () => {
    await store.append(
      baseInput({ threadId: 'thrA', eventType: 'message_created', payload: { role: 'assistant' } }),
    );
    const a2 = await store.append(
      baseInput({ threadId: 'thrA', eventType: 'message_stream_started', payload: {} }),
    );
    const b1 = await store.append(
      baseInput({ threadId: 'thrB', eventType: 'message_created', payload: { role: 'assistant' } }),
    );
    expect(a2.sequence).toBe(2);
    expect(b1.sequence).toBe(1);
  });

  it('is idempotent: re-appending with the same idempotencyKey returns the original event', async () => {
    const first = await store.append(
      baseInput({
        eventType: 'message_completed',
        payload: { text: 'final' },
        idempotencyKey: 'done-1',
      }),
    );
    const retry = await store.append(
      baseInput({
        eventType: 'message_completed',
        payload: { text: 'final' },
        idempotencyKey: 'done-1',
      }),
    );
    expect(retry.id).toBe(first.id);
    expect(retry.sequence).toBe(first.sequence);
    expect(prisma.conversationEvent.rows).toHaveLength(1);
  });

  it('retries and still allocates a clean sequence when a sequence collision occurs', async () => {
    prisma.conversationEvent.failSequenceOnce = true;
    const result = await store.append(
      baseInput({ eventType: 'message_text_delta', payload: { delta: 'x' } }),
    );
    expect(result.sequence).toBe(1);
    expect(prisma.conversationEvent.rows).toHaveLength(1);
  });

  it('runs the onInserted hook inside the same transaction with the stored event', async () => {
    const seen: StoredConversationEvent[] = [];
    await store.append(baseInput({ eventType: 'message_stream_started', payload: {} }), {
      onInserted: async (_tx, event) => {
        seen.push(event);
      },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].sequence).toBe(1);
    expect(seen[0].eventType).toBe('message_stream_started');
  });

  it('derives a lifecycle status for terminal events', async () => {
    const completed = await store.append(
      baseInput({ eventType: 'message_completed', payload: { text: 'a' } }),
    );
    const failed = await store.append(
      baseInput({ eventType: 'tool_failed', payload: { toolCallId: 't1', errorMessage: 'x' } }),
    );
    const delta = await store.append(
      baseInput({ eventType: 'message_text_delta', payload: { delta: 'd' } }),
    );
    expect(completed.status).toBe('completed');
    expect(failed.status).toBe('failed');
    expect(delta.status).toBeNull();
  });

  it('rejects a malformed event before touching the store', async () => {
    await expect(
      store.append(baseInput({ eventType: 'message_text_delta', payload: { delta: '' } })),
    ).rejects.toBeDefined();
    expect(prisma.conversationEvent.rows).toHaveLength(0);
  });

  it('lists thread events ordered and supports resume from a sequence', async () => {
    await store.append(baseInput({ eventType: 'message_created', payload: { role: 'assistant' } }));
    await store.append(baseInput({ eventType: 'message_text_delta', payload: { delta: 'a' } }));
    await store.append(baseInput({ eventType: 'message_text_delta', payload: { delta: 'b' } }));

    const all = await store.listThreadEvents('thr1');
    expect(all.map((e) => e.sequence)).toEqual([1, 2, 3]);

    const resumed = await store.listThreadEvents('thr1', { afterSequence: 1 });
    expect(resumed.map((e) => e.sequence)).toEqual([2, 3]);
  });
});
