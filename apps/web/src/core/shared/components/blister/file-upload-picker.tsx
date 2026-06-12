"use client";

import { Clapperboard, FileText, ImageIcon, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatBytes } from "src/core/modules/files/utils/files-format";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type FileUploadPickerProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  className?: string;
  onReject?: (reason: "too_large") => void;
};

const inferPreviewKind = (file: File): "video" | "audio" | "image" | "other" => {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return "other";
};

export const FileUploadPicker = ({
  value,
  onChange,
  accept = "video/*",
  maxBytes,
  disabled = false,
  className,
  onReject,
}: FileUploadPickerProps) => {
  const t = useTranslations("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(value);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [value]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;

      if (maxBytes != null && file.size > maxBytes) {
        onReject?.("too_large");
        return;
      }

      onChange(file);
    },
    [disabled, maxBytes, onChange, onReject],
  );

  const handleFiles = (files: FileList | null) => {
    handleFile(files?.[0]);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  if (value) {
    const previewKind = inferPreviewKind(value);
    const FallbackIcon =
      previewKind === "video"
        ? Clapperboard
        : previewKind === "image"
          ? ImageIcon
          : FileText;

    return (
      <div
        className={cn(
          "overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)]",
          disabled && "pointer-events-none opacity-60",
          className,
        )}
        data-testid="file-upload-picker-selected"
      >
        <div className="relative flex aspect-video items-center justify-center bg-[var(--bg-sunken)]">
          {previewUrl && previewKind === "video" ? (
            <video
              src={previewUrl}
              className="size-full object-contain"
              muted
              playsInline
              preload="metadata"
              aria-label={value.name}
            >
              <track kind="captions" />
            </video>
          ) : previewUrl && previewKind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={value.name}
              className="size-full object-contain"
            />
          ) : previewUrl && previewKind === "audio" ? (
            <div className="flex w-full flex-col items-center gap-4 px-6 py-8">
              <Clapperboard className="size-10 text-[var(--fg-tertiary)]" aria-hidden />
              <audio src={previewUrl} controls className="w-full max-w-sm" preload="metadata">
                <track kind="captions" />
              </audio>
            </div>
          ) : (
            <FallbackIcon className="size-10 text-[var(--fg-tertiary)]" aria-hidden />
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-8 bg-[var(--bg-base)]/90 backdrop-blur-sm"
            aria-label={t("removeSelectedFile")}
            disabled={disabled}
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--line-default)] px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
            <FallbackIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <Paragraph className="truncate font-medium">{value.name}</Paragraph>
            <Paragraph size="p6" tone="tertiary" className="mt-0.5">
              {formatBytes(value.size)}
            </Paragraph>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={t("dropzoneAria")}
      aria-disabled={disabled}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--r-xl)] border-2 border-dashed border-[var(--line-strong)] bg-[var(--bg-sunken)] px-6 py-12 text-center transition-colors",
        isDragging && "border-[var(--accent)] bg-[var(--accent-soft)]",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      data-testid="file-upload-picker-empty"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3">
        <Upload className="size-5 text-[var(--fg-secondary)]" />
      </div>
      <div>
        <Paragraph className="font-medium">{t("dropzoneTitle")}</Paragraph>
        <Paragraph size="p5" tone="tertiary" className="mt-1">
          {t("dropzoneHint")}
        </Paragraph>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
};
