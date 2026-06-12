"use client";

import {
  Clapperboard,
  FileText,
  ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileEntry } from "src/core/modules/files/types/files.types";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";
import {
  canDeleteFile,
  canRenameFile,
} from "src/core/modules/files/utils/files-rules";
import { Link } from "@/i18n/routing";
import { cn } from "src/core/shared/utils";

const fileIconMap = {
  video: Clapperboard,
  doc: FileText,
  image: ImageIcon,
} as const;

type FilesListViewProps = {
  files: FileEntry[];
  onRename: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
};

export const FilesListView = ({
  files,
  onRename,
  onDelete,
}: FilesListViewProps) => {
  const t = useTranslations("files");

  if (files.length === 0) return null;

  return (
    <section aria-label={t("filesSectionAria")} className="flex flex-col gap-3">
      <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
        {t("filesSection")}
      </Paragraph>

      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
        {files.map((file, index) => {
          const Icon = fileIconMap[file.kind];

          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--bg-hover)]",
                index < files.length - 1 && "border-b border-[var(--line-default)]",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                <Icon className="size-4" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <Paragraph className="truncate font-medium">{file.name}</Paragraph>
                <Paragraph size="p6" tone="tertiary" className="mt-0.5">
                  {file.duration ? `${file.duration} · ` : ""}
                  {file.size} · {t("uploadedOn", { date: file.date })}
                </Paragraph>
              </div>

              {file.status === "processing" || file.status === "pending" ? (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {t("processing")}
                </Badge>
              ) : file.status === "failed" ? (
                <Badge variant="destructive" className="hidden sm:inline-flex">
                  {t("failed")}
                </Badge>
              ) : file.usedIn ? (
                <Badge variant="accent" className="hidden sm:inline-flex">
                  {t("usedIn", { label: file.usedIn })}
                </Badge>
              ) : (
                <Badge variant="success" className="hidden sm:inline-flex">
                  {t("available")}
                </Badge>
              )}

              {file.kind === "video" && file.origin === "upload" ? (
                <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
                  <Link href="/dashboard/agents/video-editor/new">
                    {t("openInEditor")}
                  </Link>
                </Button>
              ) : null}

              <TableRowActionsMenu
                ariaLabel={t("fileActionsMenu", { name: file.name })}
                items={[
                  {
                    id: "rename",
                    label: t("rename"),
                    icon: Pencil,
                    onClick: () => onRename(file),
                    disabled: !canRenameFile(file),
                  },
                  {
                    id: "delete",
                    label: t("delete"),
                    icon: Trash2,
                    onClick: () => onDelete(file),
                    destructive: true,
                    disabled: !canDeleteFile(file),
                  },
                ]}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
