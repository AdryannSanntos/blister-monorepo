"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Heading } from "@/core/shared/components/ui/heading";

type AgentChatEmptyStateProps = {
  icon: LucideIcon;
};

export function AgentChatEmptyState({ icon: Icon }: AgentChatEmptyStateProps) {
  const t = useTranslations("agents.chat");

  return (
    <div
      data-testid="agent-chat-empty-state"
      className="mx-auto flex max-w-an animate-in fade-in slide-in-from-bottom-2 flex-col items-center px-4 text-center duration-[var(--dur-slow)]"
    >
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute -inset-3 -z-10 rounded-full bg-[var(--accent-soft)] opacity-70 blur-2xl"
        />
        <div className="flex size-16 items-center justify-center rounded-[var(--r-xl)] text-white shadow-[var(--shadow-lg)] ring-1 ring-white/20 [background-image:var(--gradient-primary)]">
          <Icon className="size-7" aria-hidden />
        </div>
      </div>
      <Heading level="h3" as="h2">
        {t("greeting")}
      </Heading>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--fg-tertiary)]">
        {t("subtitle")}
      </p>
    </div>
  );
}
