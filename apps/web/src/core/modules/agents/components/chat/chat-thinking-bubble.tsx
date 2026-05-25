"use client";

import { SpiralLoader } from "@/components/agent-elements/spiral-loader";
import { TextShimmer } from "@/components/agent-elements/text-shimmer";
import { Bot } from "lucide-react";

export function ChatThinkingBubble() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-5 py-4 shadow-[0_8px_28px_color-mix(in_oklch,#000_5%,transparent)]">
      <div className="relative flex size-8 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)] ds-ai-pulse">
        <Bot className="size-4" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg-raised)]" />
      </div>
      <div className="flex items-center gap-2">
        <SpiralLoader size={12} />
        <TextShimmer
          as="p"
          className="text-[12.5px] text-[var(--fg-tertiary)]"
          duration={1.3}
        >
          Pensando...
        </TextShimmer>
      </div>
    </div>
  );
}
