"use client";

import { Folder, Lock, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileFolder } from "src/core/modules/files/types/files.types";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";
import { cn } from "src/core/shared/utils";
import {
  canDeleteFolder,
  canRenameFolder,
  isSystemFolder,
} from "src/core/modules/files/utils/files-rules";

type FilesFolderGridProps = {
  folders: Array<{ folder: FileFolder; itemCount: number }>;
  onOpen: (folderId: string) => void;
  onRename: (folder: FileFolder) => void;
  onDelete: (folder: FileFolder) => void;
};

export const FilesFolderGrid = ({
  folders,
  onOpen,
  onRename,
  onDelete,
}: FilesFolderGridProps) => {
  const t = useTranslations("files");

  if (folders.length === 0) return null;

  return (
    <section aria-label={t("foldersSectionAria")} className="flex flex-col gap-3">
      <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
        {t("foldersSection")}
      </Paragraph>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {folders.map(({ folder, itemCount }) => {
          const isProtected = isSystemFolder(folder);

          return (
            <div
              key={folder.id}
              className="group relative rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left"
                onClick={() => onOpen(folder.id)}
                onDoubleClick={() => onOpen(folder.id)}
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
              </button>

              <div className="absolute top-2 right-2 flex items-center gap-1">
                {isProtected ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("systemFolderBadge")}
                  </Badge>
                ) : (
                  <TableRowActionsMenu
                    ariaLabel={t("folderActionsMenu", { name: folder.name })}
                    items={[
                      {
                        id: "rename",
                        label: t("rename"),
                        icon: Pencil,
                        onClick: () => onRename(folder),
                        disabled: !canRenameFolder(folder),
                      },
                      {
                        id: "delete",
                        label: t("delete"),
                        icon: Trash2,
                        onClick: () => onDelete(folder),
                        destructive: true,
                        disabled: !canDeleteFolder(folder, itemCount),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
