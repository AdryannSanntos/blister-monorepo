"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";

type CarouselStepNavigationProps = {
  showPrev?: boolean;
  showNext?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export const CarouselStepNavigation = ({
  showPrev = true,
  showNext = true,
  onPrev,
  onNext,
}: CarouselStepNavigationProps) => {
  if (!showPrev && !showNext) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-[var(--line-soft)] pt-4",
        showPrev && showNext
          ? "justify-between"
          : showNext
            ? "justify-end"
            : "justify-start",
      )}
      data-testid="carousel-step-navigation"
    >
      {showPrev ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          data-testid="carousel-step-prev"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Etapa anterior
        </Button>
      ) : null}
      {showNext ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          data-testid="carousel-step-next"
        >
          Próxima etapa
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
};
