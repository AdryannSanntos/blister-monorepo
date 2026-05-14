import type * as React from "react";

import { cn } from "src/core/shared/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[88px] w-full resize-y rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] px-3 py-[9px] text-[13.5px] leading-[1.5] text-[var(--fg-primary)] shadow-[var(--shadow-xs)] outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] placeholder:text-[var(--fg-quaternary)] hover:border-[var(--line-default)] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
