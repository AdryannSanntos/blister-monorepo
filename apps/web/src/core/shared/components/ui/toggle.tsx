"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";

import {
  type ControlSizeInput,
  controlHeightClass,
  normalizeControlSize,
} from "src/core/shared/styles/control-size";
import { cn } from "src/core/shared/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--r-sm)] text-sm font-medium whitespace-nowrap text-[var(--fg-secondary)] transition-[background,color,border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none hover:bg-[var(--bg-sunken)] hover:text-[var(--fg-primary)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-[var(--accent-soft)] data-[state=on]:font-bold data-[state=on]:text-[var(--accent-soft-text)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border-[1.5px] border-[var(--line-default)] bg-transparent hover:bg-[var(--bg-sunken)]",
      },
      size: {
        default: `${controlHeightClass.md} min-w-[var(--control-h-md)] px-2.5`,
        xs: `${controlHeightClass.xs} min-w-[var(--control-h-xs)] px-1.5`,
        sm: `${controlHeightClass.sm} min-w-[var(--control-h-sm)] px-1.5`,
        md: `${controlHeightClass.md} min-w-[var(--control-h-md)] px-2.5`,
        lg: `${controlHeightClass.lg} min-w-[var(--control-h-lg)] px-3`,
        xl: `${controlHeightClass.xl} min-w-[var(--control-h-xl)] px-3.5`,
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    size?: ControlSizeInput;
  }) {
  const resolvedSize =
    !size || size === "default" ? "default" : normalizeControlSize(size);

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      data-size={resolvedSize === "default" ? "md" : resolvedSize}
      className={cn(toggleVariants({ variant, size: resolvedSize, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
