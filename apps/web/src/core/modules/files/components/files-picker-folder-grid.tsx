"use client";

import { Folder, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileFolder } from "src/core/modules/files/types/files.types";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";
import { isSystemFolder } from "src/core/modules/files/utils/files-rules";

type FilesPickerFolderGridProps = {
  folders: Array<{ folder: FileFolder; itemCount: number }>;
  onOpen: (folderId: string) => void;
};

export const FilesPickerFolderGrid = ({
  folders,
  onOpen,
}: FilesPickerFolderGridProps) => {
  const t = useTranslations("files");

  if (folders.length === 0) return null;

  return (
    <section aria-label={t("foldersSectionAria")} className="flex flex-col gap-3">
      <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
        {t("foldersSection")}
      </Paragraph>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map(({ folder, itemCount }) => {
          const isProtected = isSystemFolder(folder);

          return (
            <button
              key={folder.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]"
              onClick={() => onOpen(folder.id)}
              data-testid={`picker-folder-${folder.id}`}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)]",
                  isProtected
                    ? "bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]"
                    : "bg-[var(--accent-soft)] text-[var(--accent-soft-text)]",
                )}
              >
                {isProtected ? (
                  <Lock className="size-4" aria-hidden />
                ) : (
                  <Folder className="size-4" aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <Paragraph className="truncate font-medium">{folder.name}</Paragraph>
                <Paragraph size="p6" tone="tertiary" className="mt-0.5">
                  {t("itemCount", { count: itemCount })}
                </Paragraph>
              </span>

              {isProtected ? (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {t("systemFolderBadge")}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
