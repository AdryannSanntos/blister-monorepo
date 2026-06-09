import type {
  AgentRunBlockDto,
  AgentRunBlockRole,
  AgentRunBlockStatus,
  AgentRunEvent,
  AgentRunStatus,
  BlockType,
} from "@company-os/types";
import { compareAgentMessageIds } from "@company-os/types";

export type BlockState = {
  blockId: string;
  blockType: BlockType;
  index: number;
  label?: string;
  text: string;
  payload: Record<string, unknown>;
  status: AgentRunBlockStatus;
  stepKey?: string;
};

export type MessageState = {
  messageId: string;
  role: AgentRunBlockRole;
  blocks: BlockState[];
  /** Earliest block timestamp — used as a tiebreaker for non-sequenced ids. */
  createdAt?: string;
};

export type ChatBlockState = {
  messages: MessageState[];
  runStatus: AgentRunStatus;
};

export const initialChatBlockState = (
  runStatus: AgentRunStatus,
): ChatBlockState => ({
  messages: [],
  runStatus,
});

const findMessage = (
  state: ChatBlockState,
  messageId: string,
): MessageState | undefined =>
  state.messages.find((message) => message.messageId === messageId);

const upsertMessage = (
  state: ChatBlockState,
  message: MessageState,
): ChatBlockState => {
  const index = state.messages.findIndex(
    (entry) => entry.messageId === message.messageId,
  );
  if (index === -1) {
    return { ...state, messages: [...state.messages, message] };
  }
  const messages = [...state.messages];
  messages[index] = message;
  return { ...state, messages };
};

const blockIdFromDto = (block: AgentRunBlockDto): string =>
  `${block.messageId}:b${block.index}`;

const sortMessages = (messages: MessageState[]): MessageState[] =>
  [...messages].sort((a, b) => {
    const byMessageId = compareAgentMessageIds(a.messageId, b.messageId);
    if (byMessageId !== 0) return byMessageId;
    if (a.createdAt && b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return 0;
  });

export const hydrateFromBlocks = (
  blocks: AgentRunBlockDto[],
  runStatus: AgentRunStatus,
): ChatBlockState => {
  const messagesMap = new Map<string, MessageState>();

  for (const block of blocks) {
    let message = messagesMap.get(block.messageId);
    if (!message) {
      message = {
        messageId: block.messageId,
        role: block.role,
        blocks: [],
        createdAt: block.createdAt,
      };
      messagesMap.set(block.messageId, message);
    } else if (
      block.createdAt &&
      (!message.createdAt || block.createdAt < message.createdAt)
    ) {
      message.createdAt = block.createdAt;
    }

    message.blocks.push({
      blockId: blockIdFromDto(block),
      blockType: block.blockType,
      index: block.index,
      label: block.label ?? undefined,
      text: block.text ?? "",
      payload: block.payload,
      status: block.status,
      stepKey: block.stepKey ?? undefined,
    });
  }

  const messages = sortMessages(
    [...messagesMap.values()].map((message) => ({
      ...message,
      blocks: [...message.blocks].sort((a, b) => a.index - b.index),
    })),
  );

  return { messages, runStatus };
};

export const mergeBlockState = (
  persisted: ChatBlockState,
  live: ChatBlockState | undefined,
): ChatBlockState => {
  if (!live || live.messages.length === 0) return persisted;
  if (persisted.messages.length === 0) return live;

  const messageMap = new Map<string, MessageState>();
  for (const message of persisted.messages) {
    messageMap.set(message.messageId, message);
  }

  for (const liveMessage of live.messages) {
    const existing = messageMap.get(liveMessage.messageId);
    if (!existing) {
      messageMap.set(liveMessage.messageId, liveMessage);
      continue;
    }

    const blockMap = new Map(existing.blocks.map((block) => [block.blockId, block]));
    for (const block of liveMessage.blocks) {
      blockMap.set(block.blockId, block);
    }

    messageMap.set(liveMessage.messageId, {
      messageId: liveMessage.messageId,
      role: liveMessage.role ?? existing.role,
      blocks: [...blockMap.values()].sort((a, b) => a.index - b.index),
    });
  }

  return {
    messages: sortMessages([...messageMap.values()]),
    runStatus: live.runStatus ?? persisted.runStatus,
  };
};

const BLOCK_EVENT_TYPES = new Set([
  "message_start",
  "block_start",
  "block_delta",
  "block_end",
  "message_end",
]);

export const isBlockEvent = (type: AgentRunEvent["type"]): boolean =>
  BLOCK_EVENT_TYPES.has(type);

export const reduceBlockEvent = (
  state: ChatBlockState,
  event: AgentRunEvent,
): ChatBlockState => {
  const data = event.data ?? {};

  switch (event.type) {
    case "run_started":
      return { ...state, runStatus: "RUNNING" };
    case "run_paused":
      return { ...state, runStatus: "PAUSED" };
    case "run_completed":
      return { ...state, runStatus: "COMPLETED" };
    case "run_failed":
      return { ...state, runStatus: "FAILED" };
    case "message_start": {
      const messageId =
        typeof data.messageId === "string" ? data.messageId : "";
      const role =
        data.role === "user" || data.role === "assistant" ? data.role : "assistant";
      if (!messageId || findMessage(state, messageId)) return state;
      return upsertMessage(state, { messageId, role, blocks: [] });
    }
    case "block_start": {
      const messageId =
        typeof data.messageId === "string" ? data.messageId : "";
      const blockId = typeof data.blockId === "string" ? data.blockId : "";
      const blockType = data.blockType as BlockType;
      const index = typeof data.index === "number" ? data.index : 0;
      if (!messageId || !blockId) return state;

      let message = findMessage(state, messageId);
      if (!message) {
        state = upsertMessage(state, {
          messageId,
          role: "assistant",
          blocks: [],
        });
        message = findMessage(state, messageId);
      }
      if (!message) return state;
      if (message.blocks.some((block) => block.blockId === blockId)) {
        return state;
      }

      const nextBlock: BlockState = {
        blockId,
        blockType,
        index,
        label: typeof data.label === "string" ? data.label : undefined,
        stepKey: typeof data.stepKey === "string" ? data.stepKey : undefined,
        text: "",
        payload: {},
        status: "streaming",
      };

      return upsertMessage(state, {
        ...message,
        blocks: [...message.blocks, nextBlock].sort((a, b) => a.index - b.index),
      });
    }
    case "block_delta": {
      const messageId =
        typeof data.messageId === "string" ? data.messageId : "";
      const blockId = typeof data.blockId === "string" ? data.blockId : "";
      const delta = typeof data.delta === "string" ? data.delta : "";
      if (!messageId || !blockId || !delta) return state;

      const message = findMessage(state, messageId);
      if (!message) return state;

      const targetBlock = message.blocks.find((block) => block.blockId === blockId);
      if (
        targetBlock &&
        (targetBlock.status === "complete" || targetBlock.status === "error")
      ) {
        return state;
      }

      return upsertMessage(state, {
        ...message,
        blocks: message.blocks.map((block) =>
          block.blockId === blockId
            ? { ...block, text: block.text + delta }
            : block,
        ),
      });
    }
    case "block_end": {
      const messageId =
        typeof data.messageId === "string" ? data.messageId : "";
      const blockId = typeof data.blockId === "string" ? data.blockId : "";
      const status =
        data.status === "streaming" ||
        data.status === "complete" ||
        data.status === "error"
          ? data.status
          : "complete";
      const payload =
        typeof data.payload === "object" && data.payload !== null
          ? (data.payload as Record<string, unknown>)
          : {};

      if (!messageId || !blockId) return state;

      const message = findMessage(state, messageId);
      if (!message) return state;

      return upsertMessage(state, {
        ...message,
        blocks: message.blocks.map((block) =>
          block.blockId === blockId
            ? {
                ...block,
                status,
                payload: { ...block.payload, ...payload },
                text:
                  typeof payload.text === "string" && payload.text.length > 0
                    ? payload.text
                    : block.text,
              }
            : block,
        ),
      });
    }
    case "message_end":
      return state;
    default:
      return state;
  }
};
