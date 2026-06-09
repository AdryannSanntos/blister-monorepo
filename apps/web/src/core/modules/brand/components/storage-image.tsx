"use client";

import { cn } from "src/core/shared/utils";
import { useStorageImageUrl } from "src/core/modules/brand/hooks/use-storage-image";

type StorageImageProps = {
  storageKey: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function StorageImage({
  storageKey,
  alt,
  className,
  fallbackClassName,
}: StorageImageProps) {
  const { data: url, isLoading, isError } = useStorageImageUrl(storageKey);

  if (!storageKey) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl bg-[var(--bg-subtle)]",
          fallbackClassName ?? className,
        )}
        aria-hidden="true"
      />
    );
  }

  if (isError || !url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-[var(--line-subtle)] bg-[var(--bg-subtle)] text-[11px] text-[var(--fg-tertiary)]",
          fallbackClassName ?? className,
        )}
      >
        —
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}
