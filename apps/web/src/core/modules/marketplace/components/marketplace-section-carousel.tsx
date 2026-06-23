"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

const CAROUSEL_ITEM_CLASS =
  "w-[85%] shrink-0 snap-start sm:w-[calc(50%-5px)] md:w-[calc(33.333%-7px)] lg:w-[calc(25%-8px)] xl:w-[calc(20%-8px)]";

type MarketplaceSectionCarouselProps = {
  title: string;
  description?: string;
  itemCount: number;
  children: ReactNode;
};

type ScrollState = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  hasOverflow: boolean;
};

const SCROLL_EDGE_THRESHOLD = 2;

export const marketplaceSectionCarouselItemClass = CAROUSEL_ITEM_CLASS;

/** Narrow column for vertical 9:16 style previews in the marketplace carousel. */
export const marketplaceTextStyleCarouselItemClass =
  "w-[12.5rem] shrink-0 snap-start";

export const MarketplaceSectionCarousel = ({
  title,
  description,
  itemCount,
  children,
}: MarketplaceSectionCarouselProps) => {
  const t = useTranslations("marketplace.carousel");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollPrev: false,
    canScrollNext: false,
    hasOverflow: false,
  });

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const hasOverflow =
      container.scrollWidth > container.clientWidth + SCROLL_EDGE_THRESHOLD;
    const canScrollPrev = container.scrollLeft > SCROLL_EDGE_THRESHOLD;
    const canScrollNext =
      container.scrollLeft + container.clientWidth <
      container.scrollWidth - SCROLL_EDGE_THRESHOLD;

    setScrollState({ canScrollPrev, canScrollNext, hasOverflow });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    for (const child of container.children) {
      resizeObserver.observe(child);
    }

    container.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  const handleScroll = (direction: "prev" | "next") => {
    const container = scrollRef.current;
    if (!container) return;

    const firstItem = container.firstElementChild as HTMLElement | null;
    const scrollStep = firstItem
      ? firstItem.offsetWidth + 10
      : container.clientWidth * 0.8;

    container.scrollBy({
      left: direction === "next" ? scrollStep : -scrollStep,
      behavior: "smooth",
    });
  };

  const showControls = scrollState.hasOverflow && itemCount > 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Heading level="h5" as="h2">
            {title}
          </Heading>
          {description ? (
            <Paragraph size="p5" tone="tertiary">
              {description}
            </Paragraph>
          ) : null}
        </div>

        {showControls ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!scrollState.canScrollPrev}
              onClick={() => handleScroll("prev")}
              aria-label={t("prev")}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!scrollState.canScrollNext}
              onClick={() => handleScroll("next")}
              aria-label={t("next")}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none",
        )}
      >
        {children}
      </div>
    </section>
  );
};
