"use client";

import type { CarouselOutput, CarouselOutputSlide, CarouselSlideType } from "@company-os/types";
import { Download, Expand, GalleryHorizontal, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CarouselPreviewDialog } from "src/core/modules/agents/components/carousel/carousel-preview-dialog";
import type { CarouselPhaseStatus } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CarouselStepErrorState,
  CarouselStepLoadingState,
} from "src/core/modules/agents/components/carousel/carousel-step-states";
import { CarouselSlideRenderer } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";
import { useState } from "react";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

const THUMB_WIDTH = 200;

type SlidePreviewCardProps = {
  slide: CarouselOutputSlide;
  onOpen: () => void;
};

const SlidePreviewCard = ({ slide, onOpen }: SlidePreviewCardProps) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex shrink-0 flex-col gap-2 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
    data-testid={`carousel-preview-thumb-${slide.order}`}
    aria-label={`Visualizar slide ${slide.order}`}
  >
    <div className="relative overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] shadow-[var(--shadow-sm)] transition-shadow group-hover:border-[var(--line-strong)] group-hover:shadow-[var(--shadow-md)]">
      <CarouselSlideRenderer slide={slide} displayWidth={THUMB_WIDTH} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
        <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-[var(--fg-primary)] shadow-[var(--shadow-sm)]">
          <Expand className="size-3.5" aria-hidden />
          Ampliar
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
        Slide {slide.order}
      </span>
      <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
    </div>
  </button>
);

type Props = {
  status: CarouselPhaseStatus;
  output: CarouselOutput | null;
  isExporting: boolean;
  exportDownloadUrl: string | null;
  currentStepKey?: string | null;
  runStatus?: string | null;
  errorMessage?: string | null;
  onExport: () => void;
  onNewCarousel: () => void;
};

export const CarouselPreviewStep = ({
  status,
  output,
  isExporting,
  exportDownloadUrl,
  currentStepKey,
  runStatus,
  errorMessage,
  onExport,
  onNewCarousel,
}: Props) => {
  const t = useTranslations("carousel.preview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  if (status === "idle" || status === "processing") {
    return (
      <CarouselStepLoadingState
        stepId="preview"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  if (status === "error") {
    return (
      <CarouselStepErrorState
        stepId="preview"
        message={errorMessage}
        onNewCarousel={onNewCarousel}
      />
    );
  }

  if (!output) {
    return (
      <CarouselStepLoadingState
        stepId="preview"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  const openPreview = (index = 0) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6" data-testid="carousel-preview-step">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Heading level="h4" as="h3">
              Seu carrossel está pronto
            </Heading>
            <div className="flex flex-wrap items-center gap-2">
              <Paragraph size="p5" tone="tertiary">
                {output.slides.length} slides
              </Paragraph>
              <Badge variant="secondary">
                {output.socialNetwork === "instagram"
                  ? "Instagram"
                  : output.socialNetwork}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPreview(0)}
              data-testid="carousel-preview-open-button"
            >
              <Expand className="size-4" aria-hidden />
              {t("viewCarousel")}
            </Button>
            <Button variant="outline" size="sm" onClick={onNewCarousel}>
              <GalleryHorizontal className="size-4" aria-hidden />
              Novo carrossel
            </Button>
            {exportDownloadUrl ? (
              <Button size="sm" asChild>
                <a href={exportDownloadUrl} download="carousel.zip">
                  <Download className="size-4" aria-hidden />
                  Baixar ZIP
                </a>
              </Button>
            ) : (
              <Button size="sm" onClick={onExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Gerando imagens...
                  </>
                ) : (
                  "Exportar como imagens"
                )}
              </Button>
            )}
          </div>
        </div>

        {output.slides[0] ? (
          <div
            className={cn(
              "relative overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-subtle)] p-4 sm:p-6",
            )}
          >
            <button
              type="button"
              onClick={() => openPreview(0)}
              className="group relative mx-auto block overflow-hidden rounded-[var(--r-lg)] shadow-[var(--shadow-md)] ring-1 ring-[var(--line-subtle)] transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={t("viewCarousel")}
            >
              <CarouselSlideRenderer
                slide={output.slides[0]}
                displayWidth={280}
                className="rounded-[var(--r-lg)]"
              />
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-medium text-[var(--fg-primary)] shadow-[var(--shadow-sm)]">
                  {t("viewCarousel")}
                </span>
              </div>
            </button>
            <Paragraph size="p6" tone="tertiary" className="mt-3 text-center">
              {t("heroHint")}
            </Paragraph>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Paragraph
            size="p6"
            tone="tertiary"
            className="font-semibold uppercase tracking-wide"
          >
            Todos os slides
          </Paragraph>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-4">
              {output.slides.map((slide, index) => (
                <SlidePreviewCard
                  key={slide.id}
                  slide={slide}
                  onOpen={() => openPreview(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <CarouselPreviewDialog
        open={previewOpen}
        slides={output.slides}
        initialIndex={previewIndex}
        socialNetwork={output.socialNetwork}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
};
