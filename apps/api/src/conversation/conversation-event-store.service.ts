import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AppendConversationEventInput,
  appendConversationEventInputSchema,
} from './dto/conversation-event.dto';

const UNIQUE_VIOLATION = 'P2002';
const MAX_SEQUENCE_RETRIES = 5;

export interface StoredConversationEvent {
  id: string;
  organizationId: string;
  threadId: string;
  messageId: string;
  sequence: number;
  eventType: string;
  status: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: Date;
}

function isUniqueViolation(error: unknown, target?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== UNIQUE_VIOLATION) return false;
  if (!target) return true;
  const meta = (error.meta?.target ?? []) as string[] | string;
  return Array.isArray(meta) ? meta.some((t) => t.includes(target)) : String(meta).includes(target);
}

/**
 * Append-only writer for the conversation event log. Owns the two invariants the
 * whole replay system depends on:
 *
 *  1. `sequence` is strictly monotonic per thread (enforced by a unique index;
 *     concurrent appends retry on collision instead of skipping a number).
 *  2. Appends carrying an `idempotencyKey` are exactly-once — a retried producer
 *     gets back the already-stored event instead of creating a duplicate.
 */
@Injectable()
export class ConversationEventStoreService {
  private readonly logger = new Logger(ConversationEventStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends one validated event. Runs inside the caller-provided transaction when
   * given (so the projection update stays atomic with the append); otherwise opens
   * its own. Returns the stored event including its allocated `sequence`.
   */
  async append(
    rawInput: AppendConversationEventInput,
    opts: {
      tx?: Prisma.TransactionClient;
      /** Runs inside the same transaction right after the event is inserted. */
      onInserted?: (tx: Prisma.TransactionClient, event: StoredConversationEvent) => Promise<void>;
    } = {},
  ): Promise<StoredConversationEvent> {
    const input = appendConversationEventInputSchema.parse(rawInput);
    const { tx, onInserted } = opts;

    if (input.idempotencyKey) {
      const existing = await (tx ?? this.prisma).conversationEvent.findUnique({
        where: {
          threadId_idempotencyKey: {
            threadId: input.threadId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return this.toStored(existing);
    }

    if (tx) {
      return this.insertWithSequence(tx, input, onInserted);
    }

    // Own transaction + retry loop for sequence collisions under concurrency.
    for (let attempt = 0; attempt < MAX_SEQUENCE_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction((trx) =>
          this.insertWithSequence(trx, input, onInserted),
        );
      } catch (error) {
        if (isUniqueViolation(error, 'idempotencyKey') && input.idempotencyKey) {
          const existing = await this.prisma.conversationEvent.findUnique({
            where: {
              threadId_idempotencyKey: {
                threadId: input.threadId,
                idempotencyKey: input.idempotencyKey,
              },
            },
          });
          if (existing) return this.toStored(existing);
        }
        if (isUniqueViolation(error, 'sequence') && attempt < MAX_SEQUENCE_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed to allocate a conversation event sequence after retries');
  }

  private async insertWithSequence(
    tx: Prisma.TransactionClient,
    input: AppendConversationEventInput,
    onInserted?: (tx: Prisma.TransactionClient, event: StoredConversationEvent) => Promise<void>,
  ): Promise<StoredConversationEvent> {
    const last = await tx.conversationEvent.findFirst({
      where: { threadId: input.threadId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const sequence = (last?.sequence ?? 0) + 1;

    const created = await tx.conversationEvent.create({
      data: {
        organizationId: input.organizationId,
        threadId: input.threadId,
        messageId: input.messageId,
        sequence,
        eventType: input.eventType,
        status: this.deriveStatus(input),
        payload: input.payload as unknown as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });
    const stored = this.toStored(created);
    if (onInserted) await onInserted(tx, stored);
    return stored;
  }

  /** Replay/resume read: all events for a thread, optionally after a sequence. */
  async listThreadEvents(
    threadId: string,
    options: { afterSequence?: number } = {},
  ): Promise<StoredConversationEvent[]> {
    const events = await this.prisma.conversationEvent.findMany({
      where: {
        threadId,
        ...(options.afterSequence !== undefined ? { sequence: { gt: options.afterSequence } } : {}),
      },
      orderBy: { sequence: 'asc' },
    });
    return events.map((e) => this.toStored(e));
  }

  async getMaxSequence(threadId: string): Promise<number> {
    const last = await this.prisma.conversationEvent.findFirst({
      where: { threadId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return last?.sequence ?? 0;
  }

  private deriveStatus(input: AppendConversationEventInput): string | null {
    switch (input.eventType) {
      case 'message_completed':
        return 'completed';
      case 'message_failed':
        return 'failed';
      case 'tool_completed':
      case 'context_search_completed':
      case 'file_search_completed':
      case 'web_research_completed':
        return 'completed';
      case 'tool_failed':
        return 'failed';
      default:
        return null;
    }
  }

  private toStored(row: {
    id: string;
    organizationId: string;
    threadId: string;
    messageId: string;
    sequence: number;
    eventType: string;
    status: string | null;
    payload: Prisma.JsonValue;
    idempotencyKey: string | null;
    createdAt: Date;
  }): StoredConversationEvent {
    return {
      id: row.id,
      organizationId: row.organizationId,
      threadId: row.threadId,
      messageId: row.messageId,
      sequence: row.sequence,
      eventType: row.eventType,
      status: row.status,
      payload:
        row.payload && typeof row.payload === 'object'
          ? (row.payload as Record<string, unknown>)
          : {},
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
    };
  }
}
