"use client";

import { Clapperboard, FileText, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileEntry } from "src/core/modules/files/types/files.types";
import type { FilePickerValidation } from "src/core/modules/files/utils/files-picker-rules";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

const fileIconMap = {
  video: Clapperboard,
  doc: FileText,
  image: ImageIcon,
} as const;

type FilesPickerGridProps = {
  files: FileEntry[];
  selectedId: string | null;
  getValidation: (file: FileEntry) => FilePickerValidation;
  onSelect: (file: FileEntry) => void;
  onConfirm: (file: FileEntry) => void;
};

export const FilesPickerGrid = ({
  files,
  selectedId,
  getValidation,
  onSelect,
  onConfirm,
}: FilesPickerGridProps) => {
  const t = useTranslations("files");
  const tPicker = useTranslations("files.picker");

  if (files.length === 0) return null;

  const reasonLabel = (reason: NonNullable<FilePickerValidation["reason"]>) => {
    if (reason === "failed") return tPicker("blockedFailed");
    if (reason === "processing") return tPicker("blockedProcessing");
    return tPicker("blockedFiltered");
  };

  return (
    <section aria-label={t("filesSectionAria")} className="flex flex-col gap-3">
      <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
        {t("filesSection")}
      </Paragraph>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {files.map((file) => {
          const Icon = fileIconMap[file.kind];
          const isSelected = selectedId === file.id;
          const validation = getValidation(file);
          const isDisabled = !validation.selectable;

          return (
            <button
              key={file.id}
              type="button"
              data-testid={`file-option-${file.id}`}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              className={cn(
                "overflow-hidden rounded-[var(--r-lg)] border text-left transition-colors",
                !isDisabled && "hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]",
                isSelected && validation.selectable
                  ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]"
                  : "border-[var(--line-default)] bg-[var(--bg-base)]",
                isDisabled && "cursor-not-allowed opacity-55",
              )}
              onClick={() => {
                if (isDisabled) return;
                onSelect(file);
              }}
              onDoubleClick={() => {
                if (isDisabled) return;
                onSelect(file);
                onConfirm(file);
              }}
            >
              <div className="flex aspect-[16/10] items-center justify-center bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                <Icon className="size-7" aria-hidden />
              </div>
              <div className="space-y-1.5 p-3">
                <Paragraph className="truncate font-medium">{file.name}</Paragraph>
                <Paragraph size="p6" tone="tertiary">
                  {file.duration ? `${file.duration} · ` : ""}
                  {file.size}
                </Paragraph>
                {isDisabled && validation.reason ? (
                  <Badge variant="secondary">{reasonLabel(validation.reason)}</Badge>
                ) : file.status === "processing" || file.status === "pending" ? (
                  <Badge variant="secondary">{t("processing")}</Badge>
                ) : file.status === "failed" ? (
                  <Badge variant="destructive">{t("failed")}</Badge>
                ) : (
                  <Badge variant="success">{t("available")}</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
