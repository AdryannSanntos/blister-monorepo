"use client";

import {
  Clapperboard,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileEntry } from "src/core/modules/files/types/files.types";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import {
  canDeleteFile,
  canRenameFile,
} from "src/core/modules/files/utils/files-rules";
import { Link } from "@/i18n/routing";

const fileIconMap = {
  video: Clapperboard,
  doc: FileText,
  image: ImageIcon,
} as const;

type FilesGridViewProps = {
  files: FileEntry[];
  onRename: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
};

export const FilesGridView = ({
  files,
  onRename,
  onDelete,
}: FilesGridViewProps) => {
  const t = useTranslations("files");

  if (files.length === 0) return null;

  return (
    <section aria-label={t("filesSectionAria")} className="flex flex-col gap-3">
      <Paragraph size="p6" tone="quaternary" className="font-medium uppercase tracking-[0.12em]">
        {t("filesSection")}
      </Paragraph>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {files.map((file) => {
          const Icon = fileIconMap[file.kind];

          return (
            <article
              key={file.id}
              className="group overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]"
            >
              <div className="relative flex aspect-[16/10] items-center justify-center bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                <Icon className="size-7" aria-hidden />

                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 bg-[var(--bg-base)]/80 backdrop-blur-sm"
                        aria-label={t("fileActionsMenu", { name: file.name })}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {file.kind === "video" && file.origin === "upload" ? (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/agents/video-editor/new">
                              {t("openInEditor")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem
                        disabled={!canRenameFile(file)}
                        onClick={() => onRename(file)}
                      >
                        <Pencil className="size-4" />
                        {t("rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canDeleteFile(file)}
                        onClick={() => onDelete(file)}
                      >
                        <Trash2 className="size-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2 p-3.5">
                <Paragraph className="truncate font-medium">{file.name}</Paragraph>
                <Paragraph size="p6" tone="tertiary">
                  {file.duration ? `${file.duration} · ` : ""}
                  {file.size}
                </Paragraph>
                {file.status === "processing" || file.status === "pending" ? (
                  <Badge variant="secondary">{t("processing")}</Badge>
                ) : file.status === "failed" ? (
                  <Badge variant="destructive">{t("failed")}</Badge>
                ) : file.usedIn ? (
                  <Badge variant="accent">{t("usedIn", { label: file.usedIn })}</Badge>
                ) : (
                  <Badge variant="success">{t("available")}</Badge>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
