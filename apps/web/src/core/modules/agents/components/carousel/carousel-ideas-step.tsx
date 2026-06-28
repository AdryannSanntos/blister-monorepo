"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import type { CarouselIdeaOption } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Badge } from "src/core/shared/components/ui/badge";

type Props = {
  status: CarouselPhaseStatus;
  ideas: CarouselIdeaOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const ProcessingState = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
      <Loader2 className="size-4 animate-spin" />
      <Paragraph size="p5" tone="tertiary">Gerando ideias de post...</Paragraph>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-4">
          <Skeleton className="mb-2 h-4 w-[75%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-[60%]" />
        </div>
      ))}
    </div>
  </div>
);

const CompletedState = ({ ideas, selectedId }: { ideas: CarouselIdeaOption[]; selectedId: string | null }) => {
  const selected = ideas.find((i) => i.id === selectedId);
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
      <Paragraph size="p5" tone="secondary">
        Ideia escolhida:{" "}
        <span className="font-medium text-[var(--fg-primary)]">{selected?.title}</span>
      </Paragraph>
    </div>
  );
};

export const CarouselIdeasStep = ({ status, ideas, selectedId, onSelect }: Props) => {
  if (status === "idle") return null;
  if (status === "processing") return <ProcessingState />;
  if (status === "completed") return <CompletedState ideas={ideas} selectedId={selectedId} />;

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-ideas-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Escolha uma ideia para o seu carrossel</Heading>
        <Paragraph size="p5" tone="tertiary">
          Clique na ideia que mais combina com o seu tema.
        </Paragraph>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ideas.map((idea) => {
          const isSelected = idea.id === selectedId;
          return (
            <button
              key={idea.id}
              type="button"
              data-testid={`carousel-idea-card-${idea.id}`}
              onClick={() => onSelect(idea.id)}
              className={[
                "group flex flex-col gap-2 rounded-[var(--r-lg)] border p-4 text-left transition-all duration-150",
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)]"
                  : "border-[var(--line-default)] bg-[var(--bg-base)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <Paragraph className="font-semibold leading-snug text-[var(--fg-primary)]">
                  {idea.title}
                </Paragraph>
                {isSelected && (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                )}
              </div>
              <Paragraph size="p5" tone="secondary" className="leading-relaxed">
                {idea.description}
              </Paragraph>
            </button>
          );
        })}
      </div>
    </div>
  );
};
