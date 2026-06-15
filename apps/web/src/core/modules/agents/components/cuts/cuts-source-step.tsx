"use client";

import { MAX_PRESIGNED_UPLOAD_BYTES } from "@company-os/types";
import { Clapperboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { FilesPickerModal } from "src/core/modules/files/components/files-picker-modal";
import { isVideoFileForCuts } from "src/core/modules/files/utils/files-picker-rules";
import { FileUploadPicker } from "src/core/shared/components/blister/file-upload-picker";
import { Button } from "src/core/shared/components/ui/button";
import { DialogFooter } from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type CutsSourceStepProps = {
  localFile: File | null;
  existingFileName: string | null;
  existingFileSize: string | null;
  hasSource: boolean;
  onLocalFileChange: (file: File | null) => void;
  onSelectExistingFile: (fileId: string, fileName: string, fileSize: string) => void;
  onStartRun: () => Promise<void>;
};

export const CutsSourceStep = ({
  localFile,
  existingFileName,
  existingFileSize,
  hasSource,
  onLocalFileChange,
  onSelectExistingFile,
  onStartRun,
}: CutsSourceStepProps) => {
  const t = useTranslations("cuts.modal");
  const [pickerOpen, setPickerOpen] = useState(false);

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
      <div className="flex flex-col gap-4" data-testid="cuts-source-step">
        <FileUploadPicker
          value={localFile}
          onChange={onLocalFileChange}
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

      <FilesPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectExisting}
        filterFile={isVideoFileForCuts}
        title={t("filePickerTitle")}
        description={t("filePickerDescription")}
        testId="cuts-file-picker-modal"
      />
    </>
  );
};
