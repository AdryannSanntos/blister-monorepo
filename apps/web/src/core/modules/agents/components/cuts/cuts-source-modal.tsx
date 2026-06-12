"use client";

import { MAX_PRESIGNED_UPLOAD_BYTES } from "@company-os/types";
import { Clapperboard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { FilesPickerModal } from "src/core/modules/files/components/files-picker-modal";
import { isVideoFileForCuts } from "src/core/modules/files/utils/files-picker-rules";
import { FileUploadPicker } from "src/core/shared/components/blister/file-upload-picker";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type CutsSourceModalProps = {
  open: boolean;
  localFile: File | null;
  existingFileName: string | null;
  existingFileSize: string | null;
  sourceFileName: string | null;
  hasSource: boolean;
  isStarting: boolean;
  onOpenChange: (open: boolean) => void;
  onLocalFileChange: (file: File | null) => void;
  onSelectExistingFile: (fileId: string, fileName: string, fileSize: string) => void;
  onStartRun: () => Promise<void>;
};

const isSelectableMediaFile = isVideoFileForCuts;

export const CutsSourceModal = ({
  open,
  localFile,
  existingFileName,
  existingFileSize,
  sourceFileName,
  hasSource,
  isStarting,
  onOpenChange,
  onLocalFileChange,
  onSelectExistingFile,
  onStartRun,
}: CutsSourceModalProps) => {
  const t = useTranslations("cuts.modal");
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleLocalFileChange = useCallback(
    (file: File | null) => {
      onLocalFileChange(file);
    },
    [onLocalFileChange],
  );

  const handleReject = useCallback(() => {
    toast.error(t("fileTooLarge"));
  }, [t]);

  const handleSelectExisting = useCallback(
    (fileId: string, fileName: string, fileSize: string) => {
      onSelectExistingFile(fileId, fileName, fileSize);
      onLocalFileChange(null);
      toast.success(t("fileSelected", { name: fileName }));
    },
    [onLocalFileChange, onSelectExistingFile, t],
  );

  const showExistingSelection = Boolean(existingFileName) && !localFile;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isStarting) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-2xl gap-6" data-testid="cuts-source-modal">
          <DialogHeader>
            <DialogTitle>{isStarting ? t("startingTitle") : t("title")}</DialogTitle>
          </DialogHeader>

          {isStarting ? (
            <div
              className="flex flex-col items-center justify-center gap-4 py-16"
              data-testid="cuts-source-loading"
            >
              <Loader2
                className="size-10 animate-spin text-[var(--accent-primary)]"
                aria-hidden
              />
              <Paragraph className="text-center">{t("generating")}</Paragraph>
              {sourceFileName ? (
                <Paragraph size="p6" tone="tertiary" className="text-center">
                  {sourceFileName}
                </Paragraph>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                <FileUploadPicker
                  value={localFile}
                  onChange={handleLocalFileChange}
                  accept="video/*,audio/*"
                  maxBytes={MAX_PRESIGNED_UPLOAD_BYTES}
                  onReject={handleReject}
                />

                <Paragraph size="p6" tone="tertiary">
                  {t("uploadOnGenerateHint")}
                </Paragraph>

                <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                  {t("browseFiles")}
                </Button>

                {showExistingSelection ? (
                  <div
                    className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3"
                    data-testid="cuts-existing-file-selection"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                      <Clapperboard className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Paragraph className="truncate font-medium">{existingFileName}</Paragraph>
                      {existingFileSize ? (
                        <Paragraph size="p6" tone="tertiary" className="mt-0.5">
                          {existingFileSize}
                        </Paragraph>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  disabled={!hasSource}
                  onClick={() => void onStartRun()}
                  data-testid="cuts-start-run-button"
                >
                  {t("start")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FilesPickerModal
        open={pickerOpen && !isStarting}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectExisting}
        filterFile={isSelectableMediaFile}
        title={t("filePickerTitle")}
        description={t("filePickerDescription")}
        testId="cuts-file-picker-modal"
      />
    </>
  );
};
