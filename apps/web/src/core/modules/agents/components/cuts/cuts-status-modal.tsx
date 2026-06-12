"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

import type { CutsStatusPhase } from "../../hooks/use-cuts-run-modal";

type CutsStatusModalProps = {
  open: boolean;
  phase: CutsStatusPhase;
  sourceFileName: string | null;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onViewOverview: () => void;
  onRetry: () => void;
};

export const CutsStatusModal = ({
  open,
  phase,
  sourceFileName,
  errorMessage,
  onOpenChange,
  onViewOverview,
  onRetry,
}: CutsStatusModalProps) => {
  const t = useTranslations("cuts.statusModal");

  const title = phase === "success" ? t("titleSuccess") : t("titleError");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-6" data-testid="cuts-status-modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {phase === "success" ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="size-12 text-[var(--status-success)]" aria-hidden />
            <Paragraph className="text-center">{t("successStarted")}</Paragraph>
            {sourceFileName ? (
              <Paragraph size="p6" tone="tertiary" className="text-center">
                {t("sourceLabel", { name: sourceFileName })}
              </Paragraph>
            ) : null}
            <Paragraph size="p6" tone="tertiary" className="text-center">
              {t("backgroundHint")}
            </Paragraph>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircle className="size-12 text-[var(--status-error)]" aria-hidden />
            <Paragraph className="text-center">{errorMessage ?? t("errorGeneric")}</Paragraph>
          </div>
        ) : null}

        <DialogFooter>
          {phase === "success" ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("close")}
              </Button>
              <Button type="button" onClick={onViewOverview} data-testid="cuts-go-to-overview">
                {t("viewOverview")}
              </Button>
            </>
          ) : null}
          {phase === "error" ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("close")}
              </Button>
              <Button type="button" onClick={onRetry}>
                {t("retry")}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
