"use client";

import { Check } from "lucide-react";

import { Link } from "@/i18n/routing";
import { useLibraryItems } from "src/core/modules/marketplace/hooks/use-marketplace";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";

import { TextStylePreviewFrame } from "./text-style-preview-frame";

type TextStylePickerProps = {
  value?: string;
  onChange: (styleId: string) => void;
  /** Marketplace href shown when the workspace owns no text styles. */
  marketplaceHref: string;
  labels: {
    empty: string;
    browse: string;
  };
};

/**
 * Compact grid of owned TEXT_STYLE entitlements with looping video previews.
 */
export function TextStylePicker({
  value,
  onChange,
  marketplaceHref,
  labels,
}: TextStylePickerProps) {
  const { data, isLoading } = useLibraryItems();
  const styles = (data ?? []).filter((item) => item.type === "text-style");

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-36 w-[4.5rem] rounded-[var(--r-md)]" />
        ))}
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-4 text-center">
        <p className="text-[12px] text-[var(--fg-secondary)]">{labels.empty}</p>
        <Link
          href={marketplaceHref}
          className="mt-1 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
        >
          {labels.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {styles.map((style) => {
        const selected = style.id === value || style.slug === value;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onChange(style.id)}
            aria-pressed={selected}
            className={cn(
              "flex w-[5.75rem] flex-col items-center gap-2 rounded-[var(--r-md)] border p-2 text-center transition-colors sm:w-[6.5rem]",
              selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent-soft-hi)]"
                : "border-[var(--line-default)] hover:border-[var(--accent)]",
            )}
          >
            <TextStylePreviewFrame
              previewUrl={style.previewUrl}
              palette={style.palette}
              size="sm"
            />
            <span className="flex w-full items-center justify-center gap-0.5">
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[var(--fg-primary)]">
                {style.name}
              </span>
              {selected ? (
                <Check className="size-3 shrink-0 text-[var(--accent)]" aria-hidden />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
