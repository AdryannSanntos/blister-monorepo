"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type AgentChatEmptyStateProps = {
  icon: LucideIcon;
};

export function AgentChatEmptyState({ icon: Icon }: AgentChatEmptyStateProps) {
  const t = useTranslations("agents.chat");

  return (
    <div
      data-testid="agent-chat-empty-state"
      className="mx-auto flex max-w-an flex-col items-center px-4 text-center"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--r-lg)] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
        {t("greeting")}
      </h2>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--fg-tertiary)]">
        {t("subtitle")}
      </p>
    </div>
  );
}
