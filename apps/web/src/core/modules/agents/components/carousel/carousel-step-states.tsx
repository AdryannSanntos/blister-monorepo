"use client";

import { Check, GalleryHorizontal, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { CarouselRunStepId } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CAROUSEL_IDEAS_SECTION_ICON,
} from "src/core/modules/agents/components/carousel/carousel-step-icons";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import { cn } from "src/core/shared/utils";

type SubStepStatus = "pending" | "running" | "done";

type SubStep = {
  key: string;
  label: string;
  status: SubStepStatus;
};

const resolveSubSteps = (
  stepId: CarouselRunStepId,
  currentStepKey: string | null | undefined,
  t: ReturnType<typeof useTranslations<"carousel.runDetail">>,
): SubStep[] => {
  const configs: Record<CarouselRunStepId, { keys: string[]; labels: string[] }> = {
    ideas: {
      keys: ["generate_ideas"],
      labels: [t("loading.ideas.generating")],
    },
    editor: {
      keys: ["generate_slides", "render_slides", "finalize_carousel"],
      labels: [
        t("loading.preview.generating"),
        t("loading.preview.rendering"),
        t("loading.preview.finalizing"),
      ],
    },
  };

  const config = configs[stepId];
  const activeIndex = config.keys.findIndex((key) => key === currentStepKey);
  const resolvedActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return config.keys.map((key, index) => ({
    key,
    label: config.labels[index] ?? config.labels[0] ?? "",
    status:
      index < resolvedActiveIndex
        ? "done"
        : index === resolvedActiveIndex
          ? "running"
          : "pending",
  }));
};

const SubStepRow = ({ step }: { step: SubStep }) => (
  <div className="flex items-center gap-3">
    <div className="flex size-5 shrink-0 items-center justify-center">
      {step.status === "done" ? (
        <div className="flex size-5 items-center justify-center rounded-full bg-[var(--success-soft)]">
          <Check className="size-3 text-[var(--success)]" strokeWidth={3} aria-hidden />
        </div>
      ) : step.status === "running" ? (
        <Loader2 className="size-5 animate-spin text-[var(--accent)]" aria-hidden />
      ) : (
        <div className="size-2 rounded-full bg-[var(--fg-quaternary)]" aria-hidden />
      )}
    </div>
    <Paragraph
      size="p5"
      tone={step.status === "pending" ? "quaternary" : "primary"}
      className={cn("font-medium", step.status === "done" && "opacity-70")}
    >
      {step.label}
    </Paragraph>
  </div>
);

const IdeasLoadingSkeleton = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    {Array.from({ length: 5 }, (_, index) => (
      <div
        key={index}
        className="flex gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] p-4"
      >
        <Skeleton className="size-10 shrink-0 rounded-[var(--r-md)]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[60%]" />
        </div>
      </div>
    ))}
  </div>
);

const ContentLoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
          <Skeleton className="size-9 rounded-[var(--r-md)]" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-[55%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[85%]" />
        </div>
      </div>
    ))}
  </div>
);

const DesignLoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 2 }, (_, index) => (
      <div
        key={index}
        className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
          <Skeleton className="size-9 rounded-[var(--r-md)]" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[70%]" />
          <div className="grid gap-4 border-t border-[var(--line-soft)] pt-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-[var(--r-md)]" />
            <Skeleton className="h-28 rounded-[var(--r-md)]" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const PreviewLoadingSkeleton = () => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-[var(--r-md)]" />
        <Skeleton className="h-9 w-36 rounded-[var(--r-md)]" />
      </div>
    </div>
    <div className="rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-subtle)] p-6">
      <Skeleton className="mx-auto aspect-[4/5] w-[280px] rounded-[var(--r-lg)]" />
    </div>
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex shrink-0 flex-col gap-2">
          <Skeleton className="h-[250px] w-[200px] rounded-[var(--r-lg)]" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  </div>
);

const LOADING_SKELETON: Record<CarouselRunStepId, () => ReactNode> = {
  ideas: IdeasLoadingSkeleton,
  editor: PreviewLoadingSkeleton,
};

const ERROR_ICON: Record<
  CarouselRunStepId,
  typeof CAROUSEL_IDEAS_SECTION_ICON
> = {
  ideas: CAROUSEL_IDEAS_SECTION_ICON,
  editor: GalleryHorizontal,
};

type CarouselStepLoadingStateProps = {
  stepId: CarouselRunStepId;
  currentStepKey?: string | null;
  runStatus?: string | null;
};

export const CarouselStepLoadingState = ({
  stepId,
  currentStepKey,
  runStatus,
}: CarouselStepLoadingStateProps) => {
  const t = useTranslations("carousel.runDetail");
  const subSteps = resolveSubSteps(stepId, currentStepKey, t);
  const SkeletonContent = LOADING_SKELETON[stepId];
  const isQueued = runStatus === "QUEUED";

  return (
    <div
      className="flex flex-col gap-4"
      data-testid={`carousel-${stepId}-loading`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-subtle)] px-4 py-5">
        {isQueued && subSteps.every((step) => step.status !== "done") ? (
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-[var(--accent)]" aria-hidden />
            <Paragraph size="p5" className="font-medium">
              {t("loading.queued")}
            </Paragraph>
          </div>
        ) : (
          subSteps.map((step) => <SubStepRow key={step.key} step={step} />)
        )}
      </div>
      <SkeletonContent />
    </div>
  );
};

type CarouselStepErrorStateProps = {
  stepId: CarouselRunStepId;
  message?: string | null;
  onNewCarousel?: () => void;
};

export const CarouselStepErrorState = ({
  stepId,
  message,
  onNewCarousel,
}: CarouselStepErrorStateProps) => {
  const t = useTranslations("carousel.runDetail");
  const Icon = ERROR_ICON[stepId];
  const titleKey = `error.${stepId}.title` as const;
  const descriptionKey = `error.${stepId}.description` as const;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_4%,var(--bg-base))] px-6 py-10 text-center"
      data-testid={`carousel-${stepId}-error`}
      role="alert"
    >
      <SurfaceIcon
        icon={Icon}
        className="size-12 rounded-[var(--r-lg)] bg-[var(--danger-soft)] text-[var(--danger)]"
        iconClassName="size-5"
      />
      <div className="flex max-w-md flex-col gap-2">
        <Heading level="h4" as="h3">
          {t(titleKey)}
        </Heading>
        <Paragraph size="p5" tone="secondary">
          {message?.trim() || t(descriptionKey)}
        </Paragraph>
      </div>
      {onNewCarousel ? (
        <Button type="button" size="sm" onClick={onNewCarousel}>
          <GalleryHorizontal className="size-4" aria-hidden />
          {t("error.newCarousel")}
        </Button>
      ) : null}
    </div>
  );
};

export const CarouselRunDetailPageSkeleton = () => {
  const t = useTranslations("carousel.runDetail");

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="carousel-run-detail-loading"
      aria-busy="true"
    >
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-[var(--r-xl)] border border-[var(--line-default)] p-6">
        <Skeleton className="h-3 w-32" />
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="size-8 animate-spin text-[var(--accent)]" aria-hidden />
          <Paragraph size="p5" tone="tertiary">
            {t("loading.page")}
          </Paragraph>
        </div>
      </div>
    </div>
  );
};
