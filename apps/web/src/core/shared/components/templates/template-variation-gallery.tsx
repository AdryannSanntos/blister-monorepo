"use client";

import type { CarouselTemplateVariation } from "@company-os/types";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { TemplateImage } from "./template-image";
import { groupVariations, variationLabel } from "./template-labels";

type TemplateVariationGalleryProps = {
  variations: CarouselTemplateVariation[];
  accentColor?: string;
};

export const TemplateVariationGallery = ({
  variations,
  accentColor,
}: TemplateVariationGalleryProps) => {
  const [zoomed, setZoomed] = useState<CarouselTemplateVariation | null>(null);
  const groups = groupVariations(variations);

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="template-variation-gallery"
    >
      {groups.map((group) => (
        <section key={group.slideType} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--fg-primary)]">
              {group.label}
            </h3>
            <span className="text-xs text-[var(--fg-tertiary)]">
              {group.variations.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.variations.map((variation) => (
              <button
                key={variation.id}
                type="button"
                data-testid="template-variation-thumb"
                className="group flex flex-col gap-1.5 text-left"
                onClick={() => setZoomed(variation)}
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] transition-all duration-[var(--dur-base)] group-hover:border-[var(--accent)]">
                  <TemplateImage
                    src={variation.previewUrl}
                    alt={variationLabel(variation)}
                    accentColor={accentColor}
                  />
                </div>
                <span className="text-xs text-[var(--fg-tertiary)]">
                  {variationLabel(variation)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={Boolean(zoomed)} onOpenChange={() => setZoomed(null)}>
        <DialogContent className="max-w-[480px] overflow-hidden p-0">
          {zoomed ? (
            <>
              <DialogTitle className="sr-only">
                {variationLabel(zoomed)}
              </DialogTitle>
              <div className="aspect-[4/5] w-full bg-[var(--bg-sunken)]">
                <TemplateImage
                  src={zoomed.previewUrl}
                  alt={variationLabel(zoomed)}
                  accentColor={accentColor}
                />
              </div>
              <div className="px-4 py-3 text-sm text-[var(--fg-secondary)]">
                {variationLabel(zoomed)}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
