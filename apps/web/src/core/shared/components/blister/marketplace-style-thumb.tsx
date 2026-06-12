import type { MarketplaceItem } from "src/core/modules/blister-os/types/marketplace";
import { cn } from "src/core/shared/utils";

const TYPE_LABELS: Record<string, string> = {
  "edit-style": "Edit Style",
  "post-style": "Post Style",
  "caption-style": "Caption Style",
  pack: "Pack",
  template: "Template",
  asset: "Asset",
  agent: "Agente",
};

type MarketplaceStyleThumbProps = {
  item: MarketplaceItem;
  ratio?: string;
  caption?: string;
  showType?: boolean;
  flagLabel?: string | null;
  compact?: boolean;
  className?: string;
};

export const MarketplaceStyleThumb = ({
  item,
  ratio = "16 / 10",
  caption,
  showType = false,
  flagLabel,
  compact = false,
  className,
}: MarketplaceStyleThumbProps) => {
  const [a = "#1b1b22", b = "#8b7cff", c = "#f0f0f4"] = item.palette;
  const formatLabel = item.specs?.formats?.split("·")[0]?.trim();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)]",
        className,
      )}
      style={{
        aspectRatio: ratio,
        background: `radial-gradient(120% 90% at 85% 0%, ${b}33 0%, transparent 55%), radial-gradient(100% 80% at 10% 100%, ${c}22 0%, transparent 50%), linear-gradient(150deg, ${a} 0%, ${a} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className={cn(
          "absolute rounded-[var(--r-sm)] border",
          compact ? "inset-[38%_16%]" : "inset-[30%_12%]",
        )}
        style={{
          borderColor: `${c}2e`,
          background: `linear-gradient(135deg, ${b}29 0%, transparent 70%)`,
        }}
      />

      {(showType || flagLabel || formatLabel) && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex items-start justify-between gap-1",
            compact ? "p-1.5" : "p-2",
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {showType ? (
              <span className="w-fit rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
            ) : flagLabel ? (
              <span className="w-fit rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                {flagLabel}
              </span>
            ) : (
              <span />
            )}
          </div>
          {formatLabel ? (
            <span className="shrink-0 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-white backdrop-blur-sm">
              {formatLabel}
            </span>
          ) : null}
        </div>
      )}

      {caption ? (
        <span className="absolute bottom-2 left-2 right-2 truncate text-[11px] font-medium text-white drop-shadow">
          {caption}
        </span>
      ) : null}
    </div>
  );
};
