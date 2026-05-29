import type { ChatMessage } from "src/core/modules/agents/hooks/use-agent-chat";
import {
  fallbackWorkflowSections,
  getMessageToolParts,
  groupToolParts,
  type ToolSection,
} from "./chat-message-parts";
import { adaptBackendToolParts } from "./chat-tool-part-adapter";

/**
 * Single entry point for an assistant message's tool rows. Stored `toolParts`
 * (the conversational tool runtime) take priority and render through
 * `agent-elements`; run-backed messages fall back to the workflow projection.
 */
export function buildChatToolSections(message: ChatMessage): ToolSection[] {
  const storedParts = getMessageToolParts(message);
  if (storedParts.length > 0) {
    return groupToolParts(adaptBackendToolParts(storedParts));
  }

  return fallbackWorkflowSections(message);
}
