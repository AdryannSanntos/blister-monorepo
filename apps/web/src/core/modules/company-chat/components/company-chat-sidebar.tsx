"use client";

import { MessageCircle, Plus } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";

type CompanyChatSidebarProps = {
  onNewChat: () => void;
};

export function CompanyChatSidebar({ onNewChat }: CompanyChatSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line-subtle)] px-4 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            Chat
          </p>
          <p className="mt-0.5 text-[14px] font-medium text-[var(--fg-primary)]">
            Chat geral
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <MessageCircle className="size-7 text-[var(--fg-quaternary)]" />
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Inicie uma conversa com o contexto da empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
