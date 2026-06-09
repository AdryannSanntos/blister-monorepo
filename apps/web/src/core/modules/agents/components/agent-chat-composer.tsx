"use client";

import type { ChatStatus } from "ai";
import type { ReactNode } from "react";
import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import { InputBar } from "@/components/agent-elements/input-bar";
import { cn } from "@/core/shared/utils";

import { AgentSuggestionCards } from "./agent-suggestion-cards";

type AgentChatComposerProps = {
  placeholder: string;
  status: ChatStatus;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (message: { role: "user"; content: string }) => void;
  onStop: () => void;
  suggestions?: SuggestionItem[];
  onSuggestionSelect?: (item: SuggestionItem) => void;
  questionBar?: React.ComponentProps<typeof InputBar>["questionBar"];
  className?: string;
};

export function AgentChatComposer({
  placeholder,
  status,
  draft,
  onDraftChange,
  onSend,
  onStop,
  suggestions = [],
  onSuggestionSelect,
  questionBar,
  className,
}: AgentChatComposerProps) {
  const isStreaming = status === "streaming" || status === "submitted";
  const showSuggestions = suggestions.length > 0 && onSuggestionSelect;

  return (
    <div
      data-testid="agent-chat-composer"
      className={cn(
        "shrink-0 border-t border-[var(--line-subtle)] bg-[var(--bg-base)] px-4 pb-4 pt-3",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-an">
        {showSuggestions ? (
          <AgentSuggestionCards
            items={suggestions}
            onSelect={onSuggestionSelect}
            disabled={isStreaming}
            className="mb-3"
          />
        ) : null}

        <InputBar
          onSend={onSend}
          status={status}
          onStop={onStop}
          value={draft}
          onChange={onDraftChange}
          placeholder={placeholder}
          suggestions={[]}
          outerInset="flush"
          questionBar={questionBar}
          className="p-0"
        />
      </div>
    </div>
  );
}
