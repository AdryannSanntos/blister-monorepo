"use client";

import type { CarouselTemplatePreview } from "@company-os/types";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { ScrollArea } from "src/core/shared/components/ui/scroll-area";
import { TemplateImage } from "./template-image";
import { TemplateVariationGallery } from "./template-variation-gallery";

type TemplateDetailDialogProps = {
  template: CarouselTemplatePreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const TemplateDetailDialog = ({
  template,
  open,
  onOpenChange,
}: TemplateDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="template-detail-dialog"
        className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-[760px]"
      >
        {template ? (
          <>
            <DialogHeader className="flex flex-row items-start gap-3 border-b border-[var(--line-default)] p-6">
              {template.accentColor ? (
                <span
                  aria-hidden
                  className="mt-1 size-5 shrink-0 rounded-full border border-[var(--line-default)]"
                  style={{ background: template.accentColor }}
                />
              ) : null}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <DialogTitle>{template.name}</DialogTitle>
                  {template.owned ? (
                    <Badge variant="success">Adquirido</Badge>
                  ) : null}
                </div>
                <DialogDescription>{template.description}</DialogDescription>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[calc(88vh-96px)]">
              <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-[140px_1fr] gap-4">
                  <div className="aspect-[4/5] overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)]">
                    <TemplateImage
                      src={template.coverPreviewUrl}
                      alt={`Capa do template ${template.name}`}
                      accentColor={template.accentColor}
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-2 text-sm text-[var(--fg-secondary)]">
                    <p>
                      <span className="font-medium text-[var(--fg-primary)]">
                        {template.variations.length}
                      </span>{" "}
                      variações de layout, organizadas por posição da imagem e
                      tema.
                    </p>
                    <p className="text-[var(--fg-tertiary)]">
                      Cada slide do carrossel usa uma destas variações conforme
                      o conteúdo.
                    </p>
                  </div>
                </div>

                <TemplateVariationGallery
                  variations={template.variations}
                  accentColor={template.accentColor}
                />
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
