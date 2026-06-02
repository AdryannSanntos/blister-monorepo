import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ConversationCitation,
  ConversationEventType,
  ConversationMessageStatus,
  ConversationToolStatus,
} from './dto/conversation-event.dto';

/**
 * Minimal event shape needed to fold a projection. Decoupled from Prisma so the
 * folding logic is a pure function that can be exhaustively unit-tested.
 */
export interface FoldableEvent {
  sequence: number;
  eventType: ConversationEventType;
  payload: Record<string, unknown>;
}

export interface FoldedMessageState {
  status: ConversationMessageStatus;
  text: string;
  citations: ConversationCitation[];
  isStreaming: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  errorMessage: string | null;
  lastSequence: number;
}

export interface FoldedToolCallState {
  toolCallId: string;
  groupId: string | null;
  toolName: string;
  status: ConversationToolStatus;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  errorMessage: string | null;
  durationMs: number | null;
  displayOrder: number;
}

export interface FoldedProjection {
  message: FoldedMessageState;
  toolCalls: FoldedToolCallState[];
}

const SEARCH_STARTED_TOOL_NAME: Partial<Record<ConversationEventType, string>> = {
  context_search_started: 'rag_search',
  file_search_started: 'file_search',
  web_research_started: 'web_research',
};

const STARTED_EVENTS: ConversationEventType[] = [
  'tool_started',
  'context_search_started',
  'file_search_started',
  'web_research_started',
];

const COMPLETED_EVENTS: ConversationEventType[] = [
  'tool_completed',
  'context_search_completed',
  'file_search_completed',
  'web_research_completed',
];

function citationKey(c: ConversationCitation): string {
  return `${c.label}|${c.url ?? ''}|${c.sourceType ?? ''}|${c.sourceId ?? ''}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * Pure deterministic fold of an event stream into message + tool-call state.
 *
 * Events are sorted by `sequence` before folding, so the result is identical for
 * live appends and for a full replay regardless of arrival order. This is the
 * single source of truth for "what the user sees" and is where replay bugs would
 * surface — hence it is intentionally pure and heavily tested.
 */
export function foldConversationEvents(events: FoldableEvent[]): FoldedProjection {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);

  const message: FoldedMessageState = {
    status: 'pending',
    text: '',
    citations: [],
    isStreaming: false,
    isCompleted: false,
    isFailed: false,
    errorMessage: null,
    lastSequence: 0,
  };
  const citationSeen = new Set<string>();
  const tools = new Map<string, FoldedToolCallState>();

  const mergeCitations = (incoming: ConversationCitation[]) => {
    for (const c of incoming) {
      const key = citationKey(c);
      if (!citationSeen.has(key)) {
        citationSeen.add(key);
        message.citations.push(c);
      }
    }
  };

  const upsertTool = (toolCallId: string): FoldedToolCallState => {
    let tool = tools.get(toolCallId);
    if (!tool) {
      tool = {
        toolCallId,
        groupId: null,
        toolName: 'unknown',
        status: 'pending',
        inputPayload: {},
        outputPayload: null,
        errorMessage: null,
        durationMs: null,
        displayOrder: tools.size,
      };
      tools.set(toolCallId, tool);
    }
    return tool;
  };

  for (const event of ordered) {
    message.lastSequence = Math.max(message.lastSequence, event.sequence);
    const payload = asRecord(event.payload);

    switch (event.eventType) {
      case 'message_created':
        if (message.status === 'pending') message.status = 'pending';
        break;
      case 'message_stream_started':
        if (!message.isCompleted && !message.isFailed) {
          message.status = 'streaming';
          message.isStreaming = true;
        }
        break;
      case 'message_text_delta':
        message.text += String(payload.delta ?? '');
        break;
      case 'message_text_snapshot':
        message.text = String(payload.text ?? '');
        break;
      case 'message_completed':
        message.text = typeof payload.text === 'string' ? payload.text : message.text;
        message.status = 'completed';
        message.isCompleted = true;
        message.isStreaming = false;
        message.isFailed = false;
        message.errorMessage = null;
        if (Array.isArray(payload.citations)) {
          mergeCitations(payload.citations as ConversationCitation[]);
        }
        break;
      case 'message_failed':
        message.status = 'failed';
        message.isFailed = true;
        message.isStreaming = false;
        message.errorMessage =
          typeof payload.errorMessage === 'string' ? payload.errorMessage : 'unknown error';
        break;
      case 'citations_emitted':
        if (Array.isArray(payload.citations)) {
          mergeCitations(payload.citations as ConversationCitation[]);
        }
        break;
      case 'tool_group_started':
        // Group metadata is carried by tool events via groupId; nothing to fold here.
        break;
      case 'tool_progress': {
        const id = String(payload.toolCallId ?? '');
        if (!id) break;
        const tool = upsertTool(id);
        if (tool.status === 'pending') tool.status = 'running';
        break;
      }
      case 'tool_failed': {
        const id = String(payload.toolCallId ?? '');
        if (!id) break;
        const tool = upsertTool(id);
        tool.status = 'failed';
        tool.errorMessage =
          typeof payload.errorMessage === 'string' ? payload.errorMessage : 'tool error';
        if (typeof payload.durationMs === 'number') tool.durationMs = payload.durationMs;
        break;
      }
      default: {
        if (STARTED_EVENTS.includes(event.eventType)) {
          const id = String(payload.toolCallId ?? '');
          if (!id) break;
          const tool = upsertTool(id);
          tool.status =
            tool.status === 'completed' || tool.status === 'failed' ? tool.status : 'running';
          const derivedName = SEARCH_STARTED_TOOL_NAME[event.eventType];
          if (typeof payload.toolName === 'string') tool.toolName = payload.toolName;
          else if (derivedName && tool.toolName === 'unknown') tool.toolName = derivedName;
          if (typeof payload.groupId === 'string') tool.groupId = payload.groupId;
          if (payload.input && typeof payload.input === 'object') {
            tool.inputPayload = payload.input as Record<string, unknown>;
          } else if (typeof payload.query === 'string') {
            tool.inputPayload = { ...tool.inputPayload, query: payload.query };
          }
          if (typeof payload.displayOrder === 'number') tool.displayOrder = payload.displayOrder;
        } else if (COMPLETED_EVENTS.includes(event.eventType)) {
          const id = String(payload.toolCallId ?? '');
          if (!id) break;
          const tool = upsertTool(id);
          tool.status = 'completed';
          if (payload.output && typeof payload.output === 'object') {
            tool.outputPayload = payload.output as Record<string, unknown>;
          }
          if (typeof payload.resultCount === 'number') {
            tool.outputPayload = {
              ...(tool.outputPayload ?? {}),
              resultCount: payload.resultCount,
            };
          }
          if (typeof payload.durationMs === 'number') tool.durationMs = payload.durationMs;
        }
        break;
      }
    }
  }

  const toolCalls = [...tools.values()].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.toolCallId.localeCompare(b.toolCallId),
  );

  return { message, toolCalls };
}

/**
 * Persists materialized projections. Rebuilds are always derived from the event
 * log via {@link foldConversationEvents}, so the DB never diverges from the
 * canonical source of truth.
 */
@Injectable()
export class ConversationProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rebuilds the message + tool-call projections for a message from its full
   * event history. Idempotent: running it twice yields the same rows.
   */
  async rebuildMessageProjection(params: {
    organizationId: string;
    threadId: string;
    messageId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<FoldedProjection> {
    const db = params.tx ?? this.prisma;
    const events = await db.conversationEvent.findMany({
      where: { messageId: params.messageId },
      orderBy: { sequence: 'asc' },
      select: { sequence: true, eventType: true, payload: true },
    });

    const folded = foldConversationEvents(
      events.map((e) => ({
        sequence: e.sequence,
        eventType: e.eventType as ConversationEventType,
        payload: asRecord(e.payload),
      })),
    );

    await this.persistFolded({ ...params, db, folded });
    return folded;
  }

  /**
   * Incrementally folds the just-appended event into the stored projection. Reads
   * current events for the message and re-derives — correct under concurrency
   * because the event log is authoritative and ordering is by `sequence`.
   */
  async applyEventInTx(
    tx: Prisma.TransactionClient,
    params: { organizationId: string; threadId: string; messageId: string },
  ): Promise<FoldedProjection> {
    const events = await tx.conversationEvent.findMany({
      where: { messageId: params.messageId },
      orderBy: { sequence: 'asc' },
      select: { sequence: true, eventType: true, payload: true },
    });
    const folded = foldConversationEvents(
      events.map((e) => ({
        sequence: e.sequence,
        eventType: e.eventType as ConversationEventType,
        payload: asRecord(e.payload),
      })),
    );
    await this.persistFolded({ ...params, db: tx, folded });
    return folded;
  }

  private async persistFolded(params: {
    organizationId: string;
    threadId: string;
    messageId: string;
    db: Prisma.TransactionClient | PrismaService;
    folded: FoldedProjection;
  }): Promise<void> {
    const { organizationId, threadId, messageId, db, folded } = params;
    const { message, toolCalls } = folded;

    await db.conversationMessageProjection.upsert({
      where: { messageId },
      create: {
        organizationId,
        threadId,
        messageId,
        status: message.status,
        text: message.text,
        citations: message.citations as unknown as Prisma.InputJsonValue,
        isStreaming: message.isStreaming,
        isCompleted: message.isCompleted,
        isFailed: message.isFailed,
        errorMessage: message.errorMessage,
        lastSequence: message.lastSequence,
      },
      update: {
        status: message.status,
        text: message.text,
        citations: message.citations as unknown as Prisma.InputJsonValue,
        isStreaming: message.isStreaming,
        isCompleted: message.isCompleted,
        isFailed: message.isFailed,
        errorMessage: message.errorMessage,
        lastSequence: message.lastSequence,
      },
    });

    for (const tool of toolCalls) {
      await db.conversationToolCallProjection.upsert({
        where: { messageId_toolCallId: { messageId, toolCallId: tool.toolCallId } },
        create: {
          organizationId,
          threadId,
          messageId,
          toolCallId: tool.toolCallId,
          groupId: tool.groupId,
          toolName: tool.toolName,
          status: tool.status,
          inputPayload: tool.inputPayload as Prisma.InputJsonValue,
          outputPayload: (tool.outputPayload ?? undefined) as Prisma.InputJsonValue | undefined,
          errorMessage: tool.errorMessage,
          durationMs: tool.durationMs,
          displayOrder: tool.displayOrder,
        },
        update: {
          groupId: tool.groupId,
          toolName: tool.toolName,
          status: tool.status,
          inputPayload: tool.inputPayload as Prisma.InputJsonValue,
          outputPayload: (tool.outputPayload ?? undefined) as Prisma.InputJsonValue | undefined,
          errorMessage: tool.errorMessage,
          durationMs: tool.durationMs,
          displayOrder: tool.displayOrder,
        },
      });
    }
  }
}
