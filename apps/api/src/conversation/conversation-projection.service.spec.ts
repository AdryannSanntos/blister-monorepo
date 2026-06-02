import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConversationProjectionService,
  type FoldableEvent,
  foldConversationEvents,
} from './conversation-projection.service';
import type { ConversationEventType } from './dto/conversation-event.dto';

const evt = (
  sequence: number,
  eventType: ConversationEventType,
  payload: Record<string, unknown> = {},
): FoldableEvent => ({
  sequence,
  eventType,
  payload,
});

describe('foldConversationEvents — message text', () => {
  it('returns a pending empty message when there are no events', () => {
    const { message, toolCalls } = foldConversationEvents([]);
    expect(message.status).toBe('pending');
    expect(message.text).toBe('');
    expect(message.isCompleted).toBe(false);
    expect(toolCalls).toEqual([]);
  });

  it('accumulates text deltas in sequence order', () => {
    const { message } = foldConversationEvents([
      evt(1, 'message_stream_started'),
      evt(2, 'message_text_delta', { delta: 'Ola' }),
      evt(3, 'message_text_delta', { delta: ' mundo' }),
    ]);
    expect(message.text).toBe('Ola mundo');
    expect(message.isStreaming).toBe(true);
    expect(message.status).toBe('streaming');
  });

  it('folds the SAME result regardless of arrival order (replay determinism)', () => {
    const inOrder = foldConversationEvents([
      evt(1, 'message_text_delta', { delta: 'A' }),
      evt(2, 'message_text_delta', { delta: 'B' }),
      evt(3, 'message_text_delta', { delta: 'C' }),
    ]);
    const shuffled = foldConversationEvents([
      evt(3, 'message_text_delta', { delta: 'C' }),
      evt(1, 'message_text_delta', { delta: 'A' }),
      evt(2, 'message_text_delta', { delta: 'B' }),
    ]);
    expect(shuffled.message.text).toBe('ABC');
    expect(shuffled.message.text).toBe(inOrder.message.text);
    expect(shuffled.message.lastSequence).toBe(3);
  });

  it('lets a snapshot replace previously accumulated deltas', () => {
    const { message } = foldConversationEvents([
      evt(1, 'message_text_delta', { delta: 'partial junk' }),
      evt(2, 'message_text_snapshot', { text: 'clean snapshot' }),
      evt(3, 'message_text_delta', { delta: ' + more' }),
    ]);
    expect(message.text).toBe('clean snapshot + more');
  });

  it('marks completion authoritative: final text + completed flags + cleared streaming', () => {
    const { message } = foldConversationEvents([
      evt(1, 'message_stream_started'),
      evt(2, 'message_text_delta', { delta: 'streamed' }),
      evt(3, 'message_completed', { text: 'final answer', citations: [{ label: 'Brain' }] }),
    ]);
    expect(message.text).toBe('final answer');
    expect(message.status).toBe('completed');
    expect(message.isCompleted).toBe(true);
    expect(message.isStreaming).toBe(false);
    expect(message.citations).toEqual([{ label: 'Brain' }]);
  });

  it('marks failure and clears streaming, preserving partial text for reidratacao', () => {
    const { message } = foldConversationEvents([
      evt(1, 'message_stream_started'),
      evt(2, 'message_text_delta', { delta: 'half-written' }),
      evt(3, 'message_failed', { errorMessage: 'LLM timeout' }),
    ]);
    expect(message.status).toBe('failed');
    expect(message.isFailed).toBe(true);
    expect(message.isStreaming).toBe(false);
    expect(message.errorMessage).toBe('LLM timeout');
    expect(message.text).toBe('half-written');
  });

  it('does not let a stray stream_started downgrade an already-completed message', () => {
    const { message } = foldConversationEvents([
      evt(1, 'message_completed', { text: 'done' }),
      evt(2, 'message_stream_started'),
    ]);
    expect(message.status).toBe('completed');
    expect(message.isStreaming).toBe(false);
  });

  it('deduplicates citations across multiple emissions', () => {
    const { message } = foldConversationEvents([
      evt(1, 'citations_emitted', { citations: [{ label: 'Brain', sourceId: 'b1' }] }),
      evt(2, 'citations_emitted', {
        citations: [
          { label: 'Brain', sourceId: 'b1' },
          { label: 'Asset', sourceId: 'a1' },
        ],
      }),
    ]);
    expect(message.citations).toEqual([
      { label: 'Brain', sourceId: 'b1' },
      { label: 'Asset', sourceId: 'a1' },
    ]);
  });
});

describe('foldConversationEvents — tool calls', () => {
  it('folds a full tool lifecycle into one completed tool row', () => {
    const { toolCalls } = foldConversationEvents([
      evt(1, 'tool_group_started', { groupId: 'g1', label: 'Pesquisando contexto' }),
      evt(2, 'tool_started', {
        toolCallId: 't1',
        toolName: 'rag_search',
        groupId: 'g1',
        input: { query: 'x' },
      }),
      evt(3, 'tool_progress', { toolCallId: 't1' }),
      evt(4, 'tool_completed', {
        toolCallId: 't1',
        output: { summary: 'ok' },
        durationMs: 120,
        resultCount: 3,
      }),
    ]);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toMatchObject({
      toolCallId: 't1',
      toolName: 'rag_search',
      groupId: 'g1',
      status: 'completed',
      inputPayload: { query: 'x' },
      durationMs: 120,
    });
    expect(toolCalls[0].outputPayload).toMatchObject({ summary: 'ok', resultCount: 3 });
  });

  it('marks a failed tool with its error and does not lose it', () => {
    const { toolCalls } = foldConversationEvents([
      evt(1, 'tool_started', { toolCallId: 't1', toolName: 'web_research', input: {} }),
      evt(2, 'tool_failed', { toolCallId: 't1', errorMessage: 'provider down', durationMs: 50 }),
    ]);
    expect(toolCalls[0].status).toBe('failed');
    expect(toolCalls[0].errorMessage).toBe('provider down');
    expect(toolCalls[0].durationMs).toBe(50);
  });

  it('keeps tools ordered by displayOrder then first appearance', () => {
    const { toolCalls } = foldConversationEvents([
      evt(1, 'tool_started', {
        toolCallId: 'b',
        toolName: 'file_search',
        displayOrder: 2,
        input: {},
      }),
      evt(2, 'tool_started', {
        toolCallId: 'a',
        toolName: 'rag_search',
        displayOrder: 1,
        input: {},
      }),
    ]);
    expect(toolCalls.map((t) => t.toolCallId)).toEqual(['a', 'b']);
  });

  it('folds search_started/search_completed into the same tool row by toolCallId', () => {
    const { toolCalls } = foldConversationEvents([
      evt(1, 'context_search_started', { toolCallId: 't9', query: 'empresa' }),
      evt(2, 'context_search_completed', { toolCallId: 't9', resultCount: 4, durationMs: 80 }),
    ]);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toMatchObject({
      toolCallId: 't9',
      toolName: 'rag_search',
      status: 'completed',
      inputPayload: { query: 'empresa' },
      durationMs: 80,
    });
    expect(toolCalls[0].outputPayload).toMatchObject({ resultCount: 4 });
  });

  it('ignores tool events without a toolCallId instead of creating phantom rows', () => {
    const { toolCalls } = foldConversationEvents([
      evt(1, 'tool_completed', { output: {} }),
      evt(2, 'tool_progress', {}),
    ]);
    expect(toolCalls).toEqual([]);
  });
});

describe('ConversationProjectionService.rebuildMessageProjection', () => {
  let service: ConversationProjectionService;
  let prisma: {
    conversationEvent: { findMany: jest.Mock };
    conversationMessageProjection: { upsert: jest.Mock };
    conversationToolCallProjection: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      conversationEvent: { findMany: jest.fn() },
      conversationMessageProjection: { upsert: jest.fn() },
      conversationToolCallProjection: { upsert: jest.fn() },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ConversationProjectionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ConversationProjectionService);
  });

  it('reads events ordered by sequence and upserts message + one row per tool', async () => {
    prisma.conversationEvent.findMany.mockResolvedValue([
      { sequence: 1, eventType: 'message_stream_started', payload: {} },
      { sequence: 2, eventType: 'message_text_delta', payload: { delta: 'oi' } },
      {
        sequence: 3,
        eventType: 'tool_started',
        payload: { toolCallId: 't1', toolName: 'rag_search', input: {} },
      },
      {
        sequence: 4,
        eventType: 'tool_completed',
        payload: { toolCallId: 't1', output: { ok: true } },
      },
      { sequence: 5, eventType: 'message_completed', payload: { text: 'pronto' } },
    ]);

    const folded = await service.rebuildMessageProjection({
      organizationId: 'org1',
      threadId: 'thr1',
      messageId: 'msg1',
    });

    expect(prisma.conversationEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { messageId: 'msg1' }, orderBy: { sequence: 'asc' } }),
    );
    expect(folded.message.text).toBe('pronto');
    expect(folded.message.status).toBe('completed');
    expect(prisma.conversationMessageProjection.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = prisma.conversationMessageProjection.upsert.mock.calls[0][0];
    expect(upsertArg.where).toEqual({ messageId: 'msg1' });
    expect(upsertArg.create.status).toBe('completed');
    expect(prisma.conversationToolCallProjection.upsert).toHaveBeenCalledTimes(1);
  });
});
