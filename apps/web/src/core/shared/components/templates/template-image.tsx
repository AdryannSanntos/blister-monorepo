"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "src/core/shared/utils";

type TemplateImageProps = {
  src: string;
  alt: string;
  /** Accent color used to build the fallback gradient when the image fails. */
  accentColor?: string;
  className?: string;
};

/**
 * Renders a template preview PNG. If the asset is missing (templates without
 * rendered previews yet), it falls back to an accent gradient placeholder so
 * the layout never breaks.
 */
export const TemplateImage = ({
  src,
  alt,
  accentColor = "var(--accent)",
  className,
}: TemplateImageProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, var(--bg-sunken) 130%)`,
        }}
      >
        <ImageIcon className="size-4 text-white/70" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public asset, no Next loader needed
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
};
