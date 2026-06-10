"use client";

import type { ChatStatus, UIMessage } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import { MessageList } from "@/components/agent-elements/message-list";
import type { CustomToolRendererProps } from "@/components/agent-elements/types";
import { cn } from "@/components/agent-elements/utils/cn";
import type { AgentUiConfig } from "../config/agent-ui-config";
import { AgentChatComposer } from "./agent-chat-composer";
import { AgentChatEmptyState } from "./agent-chat-empty-state";
import { ChatErrorBoundary } from "./chat-error-boundary";

type BlisterAgentChatProps = {
  config: AgentUiConfig;
  placeholder: string;
  messages: UIMessage[];
  status: ChatStatus;
  suggestions: SuggestionItem[];
  onSend: (message: { role: "user"; content: string }) => void;
  onStop: () => void;
  toolRenderers?: Record<string, React.ComponentType<CustomToolRendererProps>>;
  showCopyToolbar?: boolean;
  className?: string;
};

export function BlisterAgentChat({
  config,
  placeholder,
  messages,
  status,
  suggestions,
  onSend,
  onStop,
  toolRenderers,
  showCopyToolbar = true,
  className,
}: BlisterAgentChatProps) {
  const tChat = useTranslations("agents.chat");
  const [draft, setDraft] = useState("");
  const isEmpty = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";
  const Icon = config.icon;

  const assistantAvatar = (
    <div className="flex size-8 items-center justify-center rounded-[var(--r-md)] text-white shadow-[var(--shadow-xs)] [background-image:var(--gradient-primary)]">
      <Icon className="size-4" aria-hidden />
    </div>
  );

  const handleSuggestionSelect = useCallback(
    (item: SuggestionItem) => {
      if (isStreaming) return;
      const content = (item.value ?? item.label).trim();
      if (!content) return;
      onSend({ role: "user", content });
      setDraft("");
    },
    [isStreaming, onSend],
  );

  const handleSend = useCallback(
    (message: { role: "user"; content: string }) => {
      onSend(message);
      setDraft("");
    },
    [onSend],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[var(--bg-base)]",
        className,
      )}
    >
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <AgentChatEmptyState icon={Icon} />
        </div>
      ) : (
        <ChatErrorBoundary
          fallback={
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
              {tChat("renderError")}
            </div>
          }
        >
          <MessageList
            messages={messages}
            status={status}
            toolRenderers={toolRenderers}
            showCopyToolbar={showCopyToolbar}
            suppressQuestionTool={false}
            assistantAvatar={assistantAvatar}
            planningLabel={tChat("thinking")}
            className="min-h-0 flex-1 bg-[var(--bg-base)]"
          />
        </ChatErrorBoundary>
      )}

      <AgentChatComposer
        placeholder={placeholder}
        status={status}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        onStop={onStop}
        suggestions={isEmpty ? suggestions : []}
        onSuggestionSelect={isEmpty ? handleSuggestionSelect : undefined}
      />
    </div>
  );
}
