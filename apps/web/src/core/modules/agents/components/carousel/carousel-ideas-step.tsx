"use client";

import { CheckCircle2 } from "lucide-react";

import type { CarouselIdeaOption } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CarouselStepErrorState,
  CarouselStepLoadingState,
} from "src/core/modules/agents/components/carousel/carousel-step-states";
import { CAROUSEL_IDEAS_SECTION_ICON } from "src/core/modules/agents/components/carousel/carousel-step-icons";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";

type Props = {
  status: CarouselPhaseStatus;
  ideas: CarouselIdeaOption[];
  selectedId: string | null;
  reviewMode?: boolean;
  currentStepKey?: string | null;
  runStatus?: string | null;
  errorMessage?: string | null;
  onSelect: (id: string) => void;
  onUpdateSelection?: (id: string) => void;
  onNewCarousel?: () => void;
};

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

export const CarouselIdeasStep = ({
  status,
  ideas,
  selectedId,
  reviewMode = false,
  currentStepKey,
  runStatus,
  errorMessage,
  onSelect,
  onUpdateSelection,
  onNewCarousel,
}: Props) => {
  if (status === "idle" || status === "processing") {
    return (
      <CarouselStepLoadingState
        stepId="ideas"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  if (status === "error") {
    return (
      <CarouselStepErrorState
        stepId="ideas"
        message={errorMessage}
        onNewCarousel={onNewCarousel}
      />
    );
  }

  const handleIdeaClick = (id: string) => {
    if (reviewMode) {
      onUpdateSelection?.(id);
      return;
    }
    onSelect(id);
  };

  const showInteractiveGrid =
    status === "awaiting_action" || (status === "completed" && reviewMode);

  if (showInteractiveGrid && ideas.length === 0) {
    return (
      <CarouselStepLoadingState
        stepId="ideas"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  if (!showInteractiveGrid) {
    return <CompletedState ideas={ideas} selectedId={selectedId} />;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-ideas-step">
      <div className="flex flex-col gap-1.5">
        <Heading level="h4" as="h3">
          Escolha uma ideia para o seu carrossel
        </Heading>
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
              onClick={() => handleIdeaClick(idea.id)}
              className={[
                "group flex gap-3 rounded-[var(--r-lg)] border p-4 text-left transition-all duration-150",
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)]"
                  : "border-[var(--line-default)] bg-[var(--bg-base)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]",
              ].join(" ")}
            >
              <SurfaceIcon
                icon={CAROUSEL_IDEAS_SECTION_ICON}
                className="size-10 shrink-0 rounded-[var(--r-md)]"
                iconClassName="size-4"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Paragraph className="font-semibold leading-snug text-[var(--fg-primary)]">
                    {idea.title}
                  </Paragraph>
                  {isSelected ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                  ) : null}
                </div>
                <Paragraph size="p5" tone="secondary" className="leading-relaxed">
                  {idea.description}
                </Paragraph>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
