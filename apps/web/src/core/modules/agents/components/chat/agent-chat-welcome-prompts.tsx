"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { cn } from "src/core/shared/utils";

export function splitPromptRows(prompts: string[]): [string[], string[]] {
  const items = prompts.slice(0, 5);
  if (items.length <= 3) {
    return [items, []];
  }
  if (items.length === 4) {
    return [items.slice(0, 2), items.slice(2, 4)];
  }
  return [items.slice(0, 3), items.slice(3, 5)];
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 + index * 0.05,
      duration: 0.32,
      ease: [0, 0, 0.2, 1] as const,
    },
  }),
};

type AgentChatWelcomePromptsProps = {
  prompts: string[];
  icons: LucideIcon[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
};

export function AgentChatWelcomePrompts({
  prompts,
  icons,
  disabled = false,
  onSelect,
}: AgentChatWelcomePromptsProps) {
  const [topRow, bottomRow] = splitPromptRows(prompts);

  function renderRow(row: string[], rowIndex: number, offset: number) {
    if (row.length === 0) return null;

    return (
      <div
        className={cn(
          "grid w-full gap-2.5",
          row.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {row.map((prompt, index) => {
          const Icon = icons[(rowIndex * 3 + index + offset) % icons.length];
          const cardIndex = offset + index;

          return (
            <motion.div
              key={prompt}
              custom={cardIndex}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="min-w-0"
            >
              <Card data-interactive="true" className="h-full bg-[var(--bg-base)]">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(prompt)}
                  className="flex h-full min-h-[72px] w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CardContent className="flex h-full w-full flex-col justify-between gap-3 p-3.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="size-3.5" />
                    </div>
                    <p className="line-clamp-3 text-[13px] leading-[1.45] text-[var(--fg-primary)]">
                      {prompt}
                    </p>
                  </CardContent>
                </button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {renderRow(topRow, 0, 0)}
      {renderRow(bottomRow, 1, topRow.length)}
    </div>
  );
}
