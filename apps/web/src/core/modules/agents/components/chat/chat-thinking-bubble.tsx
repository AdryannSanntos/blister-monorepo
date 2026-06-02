"use client";

import React from "react";
import { TextShimmer } from "@/components/agent-elements/text-shimmer";

/**
 * Inner loading indicator (no bubble wrapper). Rendered inside the persistent
 * message bubble so the loading → content transition never swaps containers,
 * which is what caused the visible flash.
 */
export function ChatThinkingIndicator() {
  return (
    <TextShimmer
      as="p"
      className="text-sm leading-relaxed text-an-user-message-text"
      duration={1.3}
    >
      Pensando...
    </TextShimmer>
  );
}

export function ChatThinkingBubble() {
  return (
    <div
      data-testid="chat-thinking-bubble"
      className="space-y-4 rounded-an-message bg-an-user-message-bg px-5 py-3 text-sm text-an-user-message-text"
    >
      <ChatThinkingIndicator />
    </div>
  );
}
