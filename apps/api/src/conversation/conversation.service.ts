import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConversationEventStoreService,
  type StoredConversationEvent,
} from './conversation-event-store.service';
import {
  ConversationProjectionService,
  type FoldedProjection,
  foldConversationEvents,
} from './conversation-projection.service';
import {
  type AppendConversationEventInput,
  type ConversationEventType,
} from './dto/conversation-event.dto';

export interface AppendedEventResult {
  event: StoredConversationEvent;
  projection: FoldedProjection;
}

export interface MessageReplay {
  messageId: string;
  status: string;
  text: string;
  citations: unknown;
  isStreaming: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  errorMessage: string | null;
  lastSequence: number;
  toolCalls: Array<{
    toolCallId: string;
    groupId: string | null;
    toolName: string;
    status: string;
    inputPayload: unknown;
    outputPayload: unknown;
    errorMessage: string | null;
    durationMs: number | null;
    displayOrder: number;
  }>;
}

export interface ThreadReplay {
  threadId: string;
  lastSequence: number;
  messages: MessageReplay[];
}

/**
 * Consumer-agnostic facade over the conversation event log and its projections.
 * `agent chat` is the first consumer; `company chat` can adopt it unchanged. It
 * never references `AgentRun` — it only knows about threads, messages, events and
 * projections.
 */
@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: ConversationEventStoreService,
    private readonly projections: ConversationProjectionService,
  ) {}

  /**
   * Appends an event and updates its message projection atomically. The projection
   * is re-folded from the authoritative event log inside the same transaction, so
   * a crash can never leave the projection ahead of the log.
   */
  async appendEvent(input: AppendConversationEventInput): Promise<AppendedEventResult> {
    let projection: FoldedProjection | undefined;
    const event = await this.eventStore.append(input, {
      onInserted: async (tx) => {
        projection = await this.projections.applyEventInTx(tx, {
          organizationId: input.organizationId,
          threadId: input.threadId,
          messageId: input.messageId,
        });
      },
    });

    // When the append was deduped by idempotencyKey, `onInserted` did not run;
    // rebuild the projection so the caller always receives current state.
    if (!projection) {
      projection = await this.projections.rebuildMessageProjection({
        organizationId: event.organizationId,
        threadId: event.threadId,
        messageId: event.messageId,
      });
    }

    return { event, projection };
  }

  /** Convenience helper used by producers that stream many events for a message. */
  async appendMany(inputs: AppendConversationEventInput[]): Promise<AppendedEventResult[]> {
    const results: AppendedEventResult[] = [];
    for (const input of inputs) {
      results.push(await this.appendEvent(input));
    }
    return results;
  }

  async getMaxSequence(threadId: string): Promise<number> {
    return this.eventStore.getMaxSequence(threadId);
  }

  /** Raw ordered events for SSE resume from a known sequence. */
  async listEventsSince(
    threadId: string,
    afterSequence?: number,
  ): Promise<StoredConversationEvent[]> {
    return this.eventStore.listThreadEvents(threadId, { afterSequence });
  }

  /**
   * Full persisted replay of a thread, read from the stored projections (fast
   * path). Falls back to folding raw events when a projection row is missing.
   */
  async getThreadReplay(organizationId: string, threadId: string): Promise<ThreadReplay> {
    const [messageProjections, toolProjections, maxSequence] = await Promise.all([
      this.prisma.conversationMessageProjection.findMany({
        where: { threadId, organizationId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.conversationToolCallProjection.findMany({
        where: { threadId, organizationId },
        orderBy: [{ messageId: 'asc' }, { displayOrder: 'asc' }],
      }),
      this.eventStore.getMaxSequence(threadId),
    ]);

    const toolsByMessage = new Map<string, typeof toolProjections>();
    for (const tool of toolProjections) {
      const list = toolsByMessage.get(tool.messageId) ?? [];
      list.push(tool);
      toolsByMessage.set(tool.messageId, list);
    }

    const messages: MessageReplay[] = messageProjections.map((m) => ({
      messageId: m.messageId,
      status: m.status,
      text: m.text,
      citations: m.citations,
      isStreaming: m.isStreaming,
      isCompleted: m.isCompleted,
      isFailed: m.isFailed,
      errorMessage: m.errorMessage,
      lastSequence: m.lastSequence,
      toolCalls: (toolsByMessage.get(m.messageId) ?? []).map((t) => ({
        toolCallId: t.toolCallId,
        groupId: t.groupId,
        toolName: t.toolName,
        status: t.status,
        inputPayload: t.inputPayload,
        outputPayload: t.outputPayload,
        errorMessage: t.errorMessage,
        durationMs: t.durationMs,
        displayOrder: t.displayOrder,
      })),
    }));

    return { threadId, lastSequence: maxSequence, messages };
  }

  /**
   * Re-derives a single message projection from its events. Recovery hook for the
   * resilience requirement: a partially-failed stream can always be reidratada.
   */
  async rebuildMessage(params: {
    organizationId: string;
    threadId: string;
    messageId: string;
  }): Promise<FoldedProjection> {
    return this.projections.rebuildMessageProjection(params);
  }

  /** Pure fold exposed for callers that want projection state without persistence. */
  foldEvents(
    events: Array<{
      sequence: number;
      eventType: ConversationEventType;
      payload: Record<string, unknown>;
    }>,
  ): FoldedProjection {
    return foldConversationEvents(events);
  }
}
