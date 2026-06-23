"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CutsSourceStep } from "src/core/modules/agents/components/cuts/cuts-source-step";
import type { useCutsRunModal } from "src/core/modules/agents/hooks/use-cuts-run-modal";
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

type CutsController = ReturnType<typeof useCutsRunModal>;

export const CutsRunModal = ({
  controller,
}: {
  controller: CutsController;
}) => {
  const t = useTranslations("cuts.modal");
  const {
    open,
    localFile,
    sourceFileName,
    sourceFileSize,
    hasSource,
    hasExistingSource,
    isSubmitting,
    isUploading,
    uploadProgress,
    runOptions,
    sourcePreviewUrl,
    errorMessage,
    handleClose,
    handleLocalFileChange,
    handleSelectExistingFile,
    handleRunOptionsChange,
    handleStartRun,
  } = controller;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) handleClose();
      }}
    >
      <DialogContent
        data-testid="cuts-run-modal"
        data-phase="source"
        showCloseButton
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
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
            data-testid="cuts-error-alert"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-[var(--danger)]"
              aria-hidden
            />
            <Paragraph size="p6">{errorMessage}</Paragraph>
          </div>
        ) : null}

        <CutsSourceStep
          localFile={localFile}
          existingFileName={hasExistingSource ? sourceFileName : null}
          existingFileSize={hasExistingSource ? sourceFileSize : null}
          hasSource={hasSource}
          isSubmitting={isSubmitting}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          previewUrl={sourcePreviewUrl}
          runOptions={runOptions}
          onLocalFileChange={handleLocalFileChange}
          onSelectExistingFile={handleSelectExistingFile}
          onRunOptionsChange={handleRunOptionsChange}
          onStartRun={handleStartRun}
        />

        <DialogFooter className="sr-only">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
