"use client";

import type { CarouselSlideContent, CarouselSlideType } from "@company-os/types";
import { Check, Loader2 } from "lucide-react";

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

type SlideCardProps = { slide: CarouselSlideContent; index: number };

const SlideCopyLine = ({
  value,
  tone = "secondary",
  className,
}: {
  value: string;
  tone?: "primary" | "secondary" | "tertiary";
  className?: string;
}) => (
  <Paragraph size="p5" tone={tone} className={className}>
    {value}
  </Paragraph>
);

const SlideCard = ({ slide, index }: SlideCardProps) => (
  <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] overflow-hidden">
    <div className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[12px] font-semibold text-[var(--fg-tertiary)]">
        {index + 1}
      </span>
      <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
    </div>
    <div className="flex flex-col gap-1.5 p-4">
      {slide.title ? (
        <SlideCopyLine
          value={slide.title}
          tone="primary"
          className="font-semibold line-clamp-4"
        />
      ) : null}
      {slide.subtitle ? (
        <SlideCopyLine value={slide.subtitle} className="line-clamp-2" />
      ) : null}
      {slide.body ? <SlideCopyLine value={slide.body} className="line-clamp-3" /> : null}
      {slide.body2 ? <SlideCopyLine value={slide.body2} className="line-clamp-2" /> : null}
      {slide.callToAction ? (
        <SlideCopyLine value={`→ ${slide.callToAction}`} tone="tertiary" className="mt-1 font-medium" />
      ) : null}
    </div>
  </div>
);

type Props = {
  slides: CarouselSlideContent[];
  isApproving: boolean;
  onApprove: () => void;
};

export const CarouselContentApprovalStep = ({
  slides,
  isApproving,
  onApprove,
}: Props) => (
  <div className="flex size-full flex-col overflow-hidden">
    <div className="flex flex-col gap-1.5 border-b border-[var(--line-default)] px-6 py-5">
      <Heading level="h4" as="h2">
        Revise o conteúdo gerado
      </Heading>
      <Paragraph size="p5" tone="secondary">
        Confira os textos de cada slide antes de gerar as imagens.
      </Paragraph>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {slides.map((slide, index) => (
          <SlideCard key={slide.id} slide={slide} index={index} />
        ))}
      </div>
    </div>

    <div className="flex items-center justify-end gap-3 border-t border-[var(--line-default)] px-6 py-4">
      <Button
        type="button"
        onClick={onApprove}
        disabled={isApproving}
        data-testid="carousel-content-approve-button"
      >
        {isApproving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Gerando slides…
          </>
        ) : (
          <>
            <Check className="size-4" aria-hidden />
            Aprovar e gerar slides
          </>
        )}
      </Button>
    </div>
  </div>
);
