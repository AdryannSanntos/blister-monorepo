"use client";

import { Download, GalleryHorizontal, Loader2 } from "lucide-react";
import { useState } from "react";

import type { CarouselOutput, CarouselOutputSlide, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

// Instagram square: display at 270px (25% of 1080)
const PREVIEW_SIZE = 270;

const SlidePreviewFrame = ({ slide }: { slide: CarouselOutputSlide }) => {
  const srcDoc = `<!doctype html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;width:1080px;height:1080px}${slide.cssContent}</style></head><body>${slide.htmlContent}</body></html>`;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)]"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        <iframe
          srcDoc={srcDoc}
          title={`Slide ${slide.order}`}
          scrolling="no"
          style={{
            width: 1080,
            height: 1080,
            transform: `scale(${PREVIEW_SIZE / 1080})`,
            transformOrigin: "top left",
            border: "none",
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
          Slide {slide.order}
        </span>
        <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  output: CarouselOutput | null;
  isExporting: boolean;
  onExport: () => void;
  onNewCarousel: () => void;
};

export const CarouselPreviewStep = ({
  status, output, isExporting, onExport, onNewCarousel,
}: Props) => {
  const [exported, setExported] = useState(false);

  if (status === "idle" || status === "processing") {
    if (status === "processing") {
      return (
        <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
          <Loader2 className="size-4 animate-spin" />
          <Paragraph size="p5" tone="tertiary">Gerando slides finais...</Paragraph>
        </div>
      );
    }
    return null;
  }

  if (!output) return null;

  const handleExport = () => {
    onExport();
    setTimeout(() => setExported(true), 2200);
  };

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-preview-step">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Heading level="h6" as="h3">Seu carrossel está pronto</Heading>
          <div className="flex items-center gap-2">
            <Paragraph size="p5" tone="tertiary">{output.slides.length} slides</Paragraph>
            <Badge variant="secondary">{output.socialNetwork === "instagram" ? "Instagram" : output.socialNetwork}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewCarousel}>
            <GalleryHorizontal className="size-4" /> Novo carrossel
          </Button>
          {exported ? (
            <Button size="sm" asChild>
              <a href="#" download="carousel.zip">
                <Download className="size-4" /> Baixar ZIP
              </a>
            </Button>
          ) : (
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Gerando imagens...
                </>
              ) : (
                "Exportar como imagens"
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2">
          {output.slides.map((slide) => (
            <SlidePreviewFrame key={slide.id} slide={slide} />
          ))}
        </div>
      </div>
    </div>
  );
};
