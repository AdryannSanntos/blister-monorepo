"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CarouselSourceStep } from "./carousel-source-step";
import type { useCarouselRunModal } from "src/core/modules/agents/hooks/use-carousel-run-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type Controller = ReturnType<typeof useCarouselRunModal>;
const FORM_ID = "carousel-source-form";

export const CarouselRunModal = ({ controller }: { controller: Controller }) => {
  const t = useTranslations("carousel.modal");
  const { open, isSubmitting, errorMessage, handleClose, handleSubmit, defaultSlidesCount, defaultTemplateId, defaultBrandSettings } =
    controller;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) handleClose();
      }}
    >
      <DialogContent
        data-testid="carousel-run-modal"
        showCloseButton
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        className="max-w-lg gap-6 overflow-hidden"
      >
        <DialogDescription className="sr-only">{t("title")}</DialogDescription>

        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {errorMessage ? (
          <div
            className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] px-4 py-3"
            role="alert"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-[var(--danger)]"
              aria-hidden
            />
            <Paragraph size="p5" tone="secondary">
              {errorMessage}
            </Paragraph>
          </div>
        ) : null}

        <CarouselSourceStep
          formId={FORM_ID}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          defaultSlidesCount={defaultSlidesCount}
          defaultTemplateId={defaultTemplateId}
          defaultBrandSettings={defaultBrandSettings}
        />
      </DialogContent>
    </Dialog>
  );
};
