"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FileFolder } from "src/core/modules/files/types/files.types";
import { getParentFolderId } from "src/core/modules/files/utils/files-mapper";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";

type FilesBreadcrumbProps = {
  trail: FileFolder[];
  activeFolderId: string;
  onNavigate: (folderId: string) => void;
};

export const FilesBreadcrumb = ({
  trail,
  activeFolderId,
  onNavigate,
}: FilesBreadcrumbProps) => {
  const t = useTranslations("files");
  const parentFolderId = getParentFolderId(trail);
  const canGoBack = parentFolderId != null;

  const handleBack = () => {
    if (!parentFolderId) return;
    onNavigate(parentFolderId);
  };

  return (
    <nav
      aria-label={t("breadcrumbAria")}
      className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] px-2 py-2"
    >
      {canGoBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t("back")}
          onClick={handleBack}
          data-testid="files-breadcrumb-back"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {trail.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight
                className="size-3.5 text-[var(--fg-quaternary)]"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              className={cn(
                "rounded-[var(--r-sm)] px-2 py-1 text-sm transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent-soft-text)]",
                crumb.id === activeFolderId
                  ? "font-medium text-[var(--fg-primary)]"
                  : "text-[var(--fg-tertiary)]",
              )}
              onClick={() => onNavigate(crumb.id)}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>
    </nav>
  );
};
