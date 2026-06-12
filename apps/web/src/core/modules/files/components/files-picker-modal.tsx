"use client";

import { FolderOpen, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FilesBreadcrumb } from "src/core/modules/files/components/files-breadcrumb";
import { FilesPickerFolderGrid } from "src/core/modules/files/components/files-picker-folder-grid";
import { FilesPickerGrid } from "src/core/modules/files/components/files-picker-grid";
import { FilesPickerList } from "src/core/modules/files/components/files-picker-list";
import { useFilesExplorer } from "src/core/modules/files/hooks/use-files-explorer";
import type { FileEntry } from "src/core/modules/files/types/files.types";
import {
  validatePickerFile,
  type FilePickerValidation,
} from "src/core/modules/files/utils/files-picker-rules";
import { BlisterChipRow } from "src/core/shared/components/blister/blister-chip-row";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type FilesPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (fileId: string, fileName: string, fileSize: string) => void;
  title?: string;
  description?: string;
  filterFile?: (file: FileEntry) => boolean;
  testId?: string;
};

const viewOptions = [
  { id: "list", label: "list" },
  { id: "grid", label: "grid" },
] as const;

export const FilesPickerModal = ({
  open,
  onOpenChange,
  onSelect,
  title,
  description,
  filterFile,
  testId = "files-picker-modal",
}: FilesPickerModalProps) => {
  const t = useTranslations("files");
  const tPicker = useTranslations("files.picker");

  const [folderId, setFolderId] = useState("root");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);

  const {
    breadcrumb,
    childFoldersWithCounts,
    folderFiles,
    isLoading,
    isError,
    refetch,
  } = useFilesExplorer(folderId);

  const validationOptions = useMemo(() => ({ filterFile }), [filterFile]);

  const getValidation = useCallback(
    (file: FileEntry): FilePickerValidation =>
      validatePickerFile(file, validationOptions),
    [validationOptions],
  );

  const displayFiles = useMemo(
    () => (filterFile ? folderFiles.filter(filterFile) : folderFiles),
    [filterFile, folderFiles],
  );

  const hasFolders = childFoldersWithCounts.length > 0;
  const hasAnyFiles = folderFiles.length > 0;
  const hasDisplayFiles = displayFiles.length > 0;
  const hasSelectableFiles = displayFiles.some((file) => getValidation(file).selectable);
  const isFolderEmpty = !hasFolders && !hasAnyFiles;
  const isFilterEmpty = hasAnyFiles && filterFile != null && !hasDisplayFiles;
  const isSelectionBlocked = selectedFile != null && !getValidation(selectedFile).selectable;

  const selectedValidation = selectedFile ? getValidation(selectedFile) : null;
  const canConfirm = selectedValidation?.selectable === true;

  useEffect(() => {
    if (!open) {
      setFolderId("root");
      setView("list");
      setSelectedFile(null);
    }
  }, [open]);

  const handleNavigate = useCallback((nextFolderId: string) => {
    setFolderId(nextFolderId);
    setSelectedFile(null);
  }, []);

  const handleFileSelect = useCallback(
    (file: FileEntry) => {
      const validation = getValidation(file);
      if (!validation.selectable) {
        if (validation.reason === "failed") {
          toast.error(tPicker("toastFailed"));
        } else if (validation.reason === "processing") {
          toast.error(tPicker("toastProcessing"));
        } else {
          toast.error(tPicker("toastFiltered"));
        }
        return;
      }
      setSelectedFile(file);
    },
    [getValidation, tPicker],
  );

  const handleConfirmFile = useCallback(
    (file: FileEntry) => {
      const validation = getValidation(file);
      if (!validation.selectable) return;
      onSelect(file.id, file.name, file.size);
      onOpenChange(false);
    },
    [getValidation, onOpenChange, onSelect],
  );

  const handleConfirm = useCallback(() => {
    if (!selectedFile || !canConfirm) {
      toast.error(tPicker("confirmDisabled"));
      return;
    }
    handleConfirmFile(selectedFile);
  }, [canConfirm, handleConfirmFile, selectedFile, tPicker]);

  const dialogTitle = title ?? tPicker("title");
  const dialogDescription = description ?? tPicker("description");

  const selectionBlockMessage = (() => {
    if (!selectedValidation?.reason) return null;
    if (selectedValidation.reason === "failed") return tPicker("blockedFailed");
    if (selectedValidation.reason === "processing") return tPicker("blockedProcessing");
    return tPicker("blockedFiltered");
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(88vh,920px)] w-[min(96vw,72rem)] max-w-none flex-col gap-4 p-6 sm:max-w-none"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilesBreadcrumb
            trail={breadcrumb}
            activeFolderId={folderId}
            onNavigate={handleNavigate}
          />
          <BlisterChipRow
            ariaLabel={t("viewAria")}
            value={view}
            onChange={(value) => setView(value as "list" | "grid")}
            options={viewOptions.map((option) => ({
              id: option.id,
              label: option.id === "grid" ? t("viewGrid") : t("viewList"),
            }))}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16">
              <Loader2 className="size-5 animate-spin text-[var(--accent-primary)]" aria-hidden />
              <Paragraph tone="tertiary">{t("loading")}</Paragraph>
            </div>
          ) : null}

          {isError ? (
            <EmptyState
              icon={FolderOpen}
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={
                <Button variant="outline" onClick={() => void refetch()}>
                  {t("retry")}
                </Button>
              }
            />
          ) : null}

          {!isLoading && !isError ? (
            <>
              <FilesPickerFolderGrid
                folders={childFoldersWithCounts}
                onOpen={handleNavigate}
              />

              {view === "list" ? (
                <FilesPickerList
                  files={displayFiles}
                  selectedId={selectedFile?.id ?? null}
                  getValidation={getValidation}
                  onSelect={handleFileSelect}
                  onConfirm={handleConfirmFile}
                />
              ) : (
                <FilesPickerGrid
                  files={displayFiles}
                  selectedId={selectedFile?.id ?? null}
                  getValidation={getValidation}
                  onSelect={handleFileSelect}
                  onConfirm={handleConfirmFile}
                />
              )}

              {isFolderEmpty ? (
                <EmptyState
                  icon={FolderOpen}
                  title={t("emptyTitle")}
                  description={t("emptyDescription")}
                />
              ) : null}

              {isFilterEmpty ? (
                <EmptyState
                  icon={FolderOpen}
                  title={tPicker("emptyFilteredTitle")}
                  description={tPicker("emptyFilteredDescription")}
                />
              ) : null}

              {!isFolderEmpty && !isFilterEmpty && !hasSelectableFiles && hasDisplayFiles ? (
                <Paragraph size="p5" tone="tertiary" className="py-4 text-center">
                  {tPicker("noSelectableFiles")}
                </Paragraph>
              ) : null}
            </>
          ) : null}
        </div>

        {selectedFile ? (
          <div
            className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3"
            data-testid="files-picker-selection-summary"
          >
            <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
              {tPicker("selectedLabel")}
            </Paragraph>
            <Paragraph className="mt-1 truncate font-medium">{selectedFile.name}</Paragraph>
            <Paragraph size="p6" tone="tertiary" className="mt-0.5">
              {selectedFile.size}
            </Paragraph>
            {isSelectionBlocked && selectionBlockMessage ? (
              <Paragraph size="p6" tone="tertiary" className="mt-2 text-[var(--status-error)]">
                {selectionBlockMessage}
              </Paragraph>
            ) : null}
          </div>
        ) : (
          <Paragraph size="p6" tone="tertiary">
            {tPicker("selectHint")}
          </Paragraph>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tPicker("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            data-testid="files-picker-confirm-button"
          >
            {tPicker("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
