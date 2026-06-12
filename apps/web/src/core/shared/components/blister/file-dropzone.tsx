"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";

type FileDropzoneProps = {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
};

export const FileDropzone = ({
  onFileSelect,
  accept = "video/*",
  className,
}: FileDropzoneProps) => {
  const t = useTranslations("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("dropzoneAria")}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--r-xl)] border-2 border-dashed border-[var(--line-strong)] bg-[var(--bg-sunken)] px-6 py-12 text-center transition-colors",
        isDragging && "border-[var(--accent)] bg-[var(--accent-soft)]",
        className,
      )}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
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
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
};
