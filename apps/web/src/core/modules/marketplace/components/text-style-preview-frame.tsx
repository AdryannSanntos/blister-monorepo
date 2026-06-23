import { cn } from "src/core/shared/utils";

type TextStylePreviewFrameProps = {
  previewUrl?: string;
  palette?: string[];
  /** sm = settings picker, md = marketplace card */
  size?: "sm" | "md";
  className?: string;
};

const sizeClass = {
  sm: "h-32 w-[72px] sm:h-36 sm:w-[81px]",
  md: "h-44 w-[99px] sm:h-48 sm:w-[108px]",
} as const;

export const TextStylePreviewFrame = ({
  previewUrl,
  palette = [],
  size = "sm",
  className,
}: TextStylePreviewFrameProps) => {
  const [a = "#1b1b22", b = "#8b7cff"] = palette;

  return (
    <div
      className={cn(
        "mx-auto shrink-0 overflow-hidden rounded-[var(--r-sm)] bg-[var(--bg-sunken)]",
        sizeClass[size],
        className,
      )}
    >
      {previewUrl ? (
        // biome-ignore lint/a11y/useMediaCaption: silent decorative preview
        <video
          src={previewUrl}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="h-full w-full"
          style={{
            background: `linear-gradient(135deg, ${a}, ${b})`,
          }}
        />
      )}
    </div>
  );
};
