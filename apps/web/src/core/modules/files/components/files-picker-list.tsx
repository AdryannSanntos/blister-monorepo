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

type FilesPickerListProps = {
  files: FileEntry[];
  selectedId: string | null;
  getValidation: (file: FileEntry) => FilePickerValidation;
  onSelect: (file: FileEntry) => void;
  onConfirm: (file: FileEntry) => void;
};

export const FilesPickerList = ({
  files,
  selectedId,
  getValidation,
  onSelect,
  onConfirm,
}: FilesPickerListProps) => {
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

      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
        {files.map((file, index) => {
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
                "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors",
                !isDisabled && "hover:bg-[var(--bg-hover)]",
                isSelected && validation.selectable && "bg-[var(--accent-soft)]",
                isDisabled && "cursor-not-allowed opacity-55",
                index < files.length - 1 && "border-b border-[var(--line-default)]",
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
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                <Icon className="size-4" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <Paragraph className="truncate font-medium">{file.name}</Paragraph>
                <Paragraph size="p6" tone="tertiary" className="mt-0.5">
                  {file.duration ? `${file.duration} · ` : ""}
                  {file.size}
                </Paragraph>
              </div>

              {isDisabled && validation.reason ? (
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                  {reasonLabel(validation.reason)}
                </Badge>
              ) : file.status === "processing" || file.status === "pending" ? (
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                  {t("processing")}
                </Badge>
              ) : file.status === "failed" ? (
                <Badge variant="destructive" className="hidden shrink-0 sm:inline-flex">
                  {t("failed")}
                </Badge>
              ) : (
                <Badge variant="success" className="hidden shrink-0 sm:inline-flex">
                  {t("available")}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
