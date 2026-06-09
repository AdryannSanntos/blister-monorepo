"use client";

import { ArrowUpRight } from "lucide-react";

import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import { cn } from "@/core/shared/utils";

type AgentSuggestionCardsProps = {
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
  disabled?: boolean;
  className?: string;
};

export function AgentSuggestionCards({
  items,
  onSelect,
  disabled,
  className,
}: AgentSuggestionCardsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="agent-suggestion-cards"
      className={cn(
        "grid gap-2 sm:grid-cols-1",
        items.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className={cn(
            "group flex min-h-[44px] items-center justify-between gap-2 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-base)] px-3 py-2.5 text-left transition-[border-color,background-color,transform] duration-[var(--dur-fast)]",
            "hover:border-[color-mix(in_oklch,var(--accent)_35%,var(--line-subtle))] hover:bg-[var(--bg-raised)]",
            "active:scale-[0.99]",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <span className="line-clamp-2 text-[13px] leading-snug text-[var(--fg-primary)]">
            {item.label}
          </span>
          <ArrowUpRight
            className="size-3.5 shrink-0 text-[var(--fg-quaternary)] transition-[color,transform] duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
