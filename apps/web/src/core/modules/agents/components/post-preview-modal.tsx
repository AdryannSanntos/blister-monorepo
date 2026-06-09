"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/components/agent-elements/utils/cn";
import { Button } from "@/core/shared/components/ui/button";
import { Checkbox } from "@/core/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/shared/components/ui/dialog";
import {
  downloadPostSlides,
  type PostDownloadFormat,
} from "@/core/modules/agents/utils/download-post-slides";

import { PostSlidePreview } from "./post-slide-preview";

const THUMBNAIL_MAX_WIDTH = 72;

type PostPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: string[];
  platform?: string;
  width: number;
  height: number;
  initialSlideIndex?: number;
};

const buildDefaultSelection = (total: number) =>
  new Set(Array.from({ length: total }, (_, index) => index));

export const PostPreviewModal = memo(function PostPreviewModal({
  open,
  onOpenChange,
  slides,
  platform,
  width,
  height,
  initialSlideIndex = 0,
}: PostPreviewModalProps) {
  const t = useTranslations("agents.postPreview");
  const [current, setCurrent] = useState(initialSlideIndex);
  const [selected, setSelected] = useState<Set<number>>(() =>
    buildDefaultSelection(slides.length),
  );
  const [format, setFormat] = useState<PostDownloadFormat>("png");
  const [downloading, setDownloading] = useState(false);

  const total = slides.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const selectedIndices = useMemo(
    () =>
      [...selected].filter((index) => index >= 0 && index < total).sort(),
    [selected, total],
  );
  const allSelected = total > 0 && selectedIndices.length === total;

  useEffect(() => {
    if (!open) return;
    setCurrent(initialSlideIndex);
    setSelected(buildDefaultSelection(slides.length));
    setFormat("png");
  }, [open, initialSlideIndex, slides.length]);

  const navButtonClass =
    "inline-flex size-8 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] text-[var(--fg-secondary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40";

  const title = [platform, `${width}×${height}`].filter(Boolean).join(" · ");
  const fileNamePrefix = platform
    ? platform.toLowerCase().replace(/\s+/g, "-")
    : "post";

  const handleToggleSlide = useCallback((index: number, checked: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? buildDefaultSelection(total) : new Set());
    },
    [total],
  );

  const handleDownload = useCallback(
    async (indices: number[]) => {
      if (indices.length === 0 || downloading) return;

      setDownloading(true);
      try {
        await downloadPostSlides({
          indices,
          slides,
          format,
          width,
          height,
          fileNamePrefix,
        });
      } catch {
        toast.error(t("downloadFailed"));
      } finally {
        setDownloading(false);
      }
    },
    [downloading, fileNamePrefix, format, height, slides, t, width],
  );

  const handleDownloadSelected = useCallback(() => {
    void handleDownload(selectedIndices);
  }, [handleDownload, selectedIndices]);

  const handleDownloadAll = useCallback(() => {
    void handleDownload(Array.from({ length: total }, (_, index) => index));
  }, [handleDownload, total]);

  const formatButtonClass = (value: PostDownloadFormat) =>
    cn(
      "rounded-[var(--r-md)] px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)]",
      format === value
        ? "bg-[var(--bg-sunken)] text-[var(--fg-primary)]"
        : "text-[var(--fg-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-secondary)]",
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(560px,calc(100%-2rem))]">
        <DialogHeader className="shrink-0 border-b border-[var(--line-subtle)] px-5 py-4">
          <DialogTitle className="text-sm font-medium text-[var(--fg-primary)]">
            {title || t("modalTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PostSlidePreview
            html={slides[safeIndex] ?? ""}
            width={width}
            height={height}
          />

          {total > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCurrent((value) => Math.max(0, value - 1))}
                disabled={safeIndex === 0}
                className={navButtonClass}
                aria-label={t("previousSlide")}
              >
                <IconChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-medium text-[var(--fg-tertiary)]">
                {t("slideCounter", {
                  current: safeIndex + 1,
                  total,
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrent((value) => Math.min(total - 1, value + 1))
                }
                disabled={safeIndex >= total - 1}
                className={navButtonClass}
                aria-label={t("nextSlide")}
              >
                <IconChevronRight className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[var(--fg-tertiary)]">
                {t("selectSlides")}
              </p>
              {total > 1 ? (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--fg-secondary)]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(value) => handleToggleAll(value === true)}
                    aria-label={allSelected ? t("deselectAll") : t("selectAll")}
                  />
                  {allSelected ? t("deselectAll") : t("selectAll")}
                </label>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {slides.map((html, index) => {
                const isActive = index === safeIndex;
                const isSelected = selected.has(index);

                return (
                  <div
                    key={index}
                    className={cn(
                      "relative shrink-0 rounded-[var(--r-md)] border p-1.5 transition-colors duration-[var(--dur-fast)]",
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line-subtle)] bg-[var(--bg-raised)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrent(index)}
                      className="block rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      aria-label={t("slideLabel", { number: index + 1 })}
                    >
                      <PostSlidePreview
                        html={html}
                        width={width}
                        height={height}
                        maxWidth={THUMBNAIL_MAX_WIDTH}
                      />
                    </button>

                    <label className="absolute top-2 left-2 inline-flex cursor-pointer rounded-[var(--r-sm)] bg-[var(--bg-overlay)]/90 p-0.5 shadow-[var(--shadow-xs)]">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) =>
                          handleToggleSlide(index, value === true)
                        }
                        aria-label={t("selectSlide", { number: index + 1 })}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-[var(--line-subtle)] px-5 py-4 sm:flex-col sm:items-stretch">
          <div
            className="inline-flex w-fit items-center gap-1 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-raised)] p-1"
            role="group"
            aria-label={t("formatLabel")}
          >
            <button
              type="button"
              className={formatButtonClass("png")}
              onClick={() => setFormat("png")}
            >
              PNG
            </button>
            <button
              type="button"
              className={formatButtonClass("html")}
              onClick={() => setFormat("html")}
            >
              HTML
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={selectedIndices.length === 0 || downloading}
              onClick={handleDownloadSelected}
              className="gap-1.5"
            >
              <IconDownload className="size-4" />
              {downloading ? t("downloading") : t("downloadSelected")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={downloading}
              onClick={handleDownloadAll}
              className="gap-1.5"
            >
              <IconDownload className="size-4" />
              {t("downloadAll")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
