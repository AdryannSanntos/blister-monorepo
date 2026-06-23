import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

type SurfaceIconProps = React.ComponentProps<"div"> & {
  icon: LucideIcon;
  iconClassName?: string;
};

export function SurfaceIcon({
  icon: Icon,
  className,
  iconClassName,
  ...props
}: SurfaceIconProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]",
        className,
      )}
    >
      <Icon className={cn("size-5", iconClassName)} />
    </div>
  );
}
