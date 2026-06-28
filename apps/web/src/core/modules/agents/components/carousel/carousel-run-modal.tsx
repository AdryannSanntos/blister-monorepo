"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { CarouselSourceStep } from "./carousel-source-step";
import type { useCarouselRunModal } from "src/core/modules/agents/hooks/use-carousel-run-modal";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type Controller = ReturnType<typeof useCarouselRunModal>;
const FORM_ID = "carousel-source-form";

export const CarouselRunModal = ({ controller }: { controller: Controller }) => {
  const { open, isSubmitting, errorMessage, handleClose, handleSubmit } = controller;

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
        onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isSubmitting) e.preventDefault(); }}
        className="max-w-lg gap-6 overflow-hidden"
      >
        <DialogDescription className="sr-only">
          Configurar novo carrossel
        </DialogDescription>

        <DialogHeader>
          <DialogTitle>Novo Carrossel</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <div
            className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
            <Paragraph size="p5" tone="secondary">
              {errorMessage}
            </Paragraph>
          </div>
        )}

        <CarouselSourceStep
          formId={FORM_ID}
          onSubmit={handleSubmit}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? "Criando..." : "Gerar carrossel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
