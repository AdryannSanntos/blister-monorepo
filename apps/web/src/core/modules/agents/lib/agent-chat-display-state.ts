import type {
  ChatCitation,
  DisplayToolCall,
  DisplayToolStatus,
  StreamMessageState,
} from "./agent-chat-event-reducer";

export type ChatAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  url?: string;
  textContent?: string;
};

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "pending" | "streaming" | "completed" | "failed";
  isStreaming: boolean;
  errorMessage: string | null;
  citations: ChatCitation[];
  toolCalls: DisplayToolCall[];
  attachments: ChatAttachment[];
  createdAt: string | null;
};

/** Persisted replay shape returned by `GET .../chat/threads/:threadId/replay`. */
export type ReplayMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: string;
  isStreaming?: boolean;
  isFailed?: boolean;
  errorMessage?: string | null;
  citations?: ChatCitation[];
  toolCalls?: Array<{
    toolCallId: string;
    groupId: string | null;
    toolName: string;
    status: string;
    inputPayload?: unknown;
    outputPayload?: unknown;
    errorMessage?: string | null;
    displayOrder?: number;
  }>;
  metadata?: unknown;
  createdAt?: string | null;
};

export type ThreadReplay = {
  threadId: string;
  lastSequence: number;
  messages: ReplayMessage[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readAttachments(metadata: unknown): ChatAttachment[] {
  const value = asRecord(metadata).attachments;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ChatAttachment =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ChatAttachment).id === "string" &&
      typeof (item as ChatAttachment).filename === "string",
  );
}

function attachmentSignature(attachments: ChatAttachment[]): string {
  return attachments
    .map((attachment) =>
      [attachment.filename, attachment.contentType, attachment.size ?? ""].join("|"),
    )
    .sort()
    .join(";;");
}

function matchesPersistedUserMessage(
  pendingUser: DisplayMessage,
  persisted: DisplayMessage[],
): boolean {
  if (pendingUser.role !== "user") return false;

  const expectedAttachments = attachmentSignature(pendingUser.attachments);
  const content = pendingUser.content.trim();

  let matchedUser: DisplayMessage | null = null;
  for (let index = persisted.length - 1; index >= 0; index -= 1) {
    const message = persisted[index];
    if (message.role !== "user") continue;
    if (
      message.content.trim() === content &&
      attachmentSignature(message.attachments) === expectedAttachments
    ) {
      matchedUser = message;
      break;
    }
  }

  if (!matchedUser) return false;
  if (matchedUser.id === pendingUser.id) return true;

  const pendingCreatedAt = pendingUser.createdAt
    ? Date.parse(pendingUser.createdAt)
    : Number.NaN;
  const matchedCreatedAt = matchedUser.createdAt
    ? Date.parse(matchedUser.createdAt)
    : Number.NaN;

  if (Number.isFinite(pendingCreatedAt) && Number.isFinite(matchedCreatedAt)) {
    // Server/client skew: same send if persisted user is not older than the optimistic one.
    return matchedCreatedAt >= pendingCreatedAt - 15_000;
  }

  const latestPersistedMessage = persisted[persisted.length - 1];
  return latestPersistedMessage?.id === matchedUser.id;
}

function normalizeToolStatus(status: string): DisplayToolStatus {
  if (status === "completed" || status === "failed" || status === "running") {
    return status;
  }
  return "pending";
}

export function replayMessageToDisplay(message: ReplayMessage): DisplayMessage {
  const status =
    message.status === "streaming" ||
    message.status === "failed" ||
    message.status === "pending"
      ? message.status
      : "completed";

  return {
    id: message.id,
    role: message.role,
    content: message.content ?? "",
    status,
    isStreaming: Boolean(message.isStreaming),
    errorMessage: message.errorMessage ?? null,
    citations: message.citations ?? [],
    toolCalls: (message.toolCalls ?? []).map((tool, index) => ({
      toolCallId: tool.toolCallId,
      groupId: tool.groupId ?? null,
      toolName: tool.toolName,
      status: normalizeToolStatus(tool.status),
      input: asRecord(tool.inputPayload),
      output: tool.outputPayload ? asRecord(tool.outputPayload) : null,
      errorMessage: tool.errorMessage ?? null,
      displayOrder: tool.displayOrder ?? index,
    })),
    attachments:
      message.role === "user" ? readAttachments(message.metadata) : [],
    createdAt: message.createdAt ?? null,
  };
}

export function streamStateToDisplay(
  state: StreamMessageState,
): DisplayMessage {
  return {
    id: state.messageId,
    role: "assistant",
    content: state.text,
    status: state.status,
    isStreaming: state.status === "pending" || state.status === "streaming",
    errorMessage: state.errorMessage,
    citations: state.citations,
    toolCalls: state.toolCalls,
    attachments: [],
    createdAt: null,
  };
}

/**
 * Merges persisted replay with the live in-flight turn. Replay is the source of
 * truth: any optimistic/live message whose id is already persisted is dropped, so
 * once the stream finishes and replay refetches, there is no duplicate.
 */
export function mergeDisplayMessages(params: {
  replay: ReplayMessage[];
  pendingUser?: DisplayMessage | null;
  streaming?: StreamMessageState | null;
}): DisplayMessage[] {
  const persisted = params.replay.map(replayMessageToDisplay);
  const persistedIds = new Set(persisted.map((m) => m.id));

  const live: DisplayMessage[] = [];
  if (
    params.pendingUser &&
    !persistedIds.has(params.pendingUser.id) &&
    !matchesPersistedUserMessage(params.pendingUser, persisted)
  ) {
    live.push(params.pendingUser);
  }
  if (params.streaming) {
    const streamingMessage = streamStateToDisplay(params.streaming);
    // Drop the live assistant once its real id is persisted in replay.
    if (
      !persistedIds.has(streamingMessage.id) ||
      streamingMessage.id.startsWith("pending-")
    ) {
      live.push(streamingMessage);
    }
  }

  return [...persisted, ...live];
}
