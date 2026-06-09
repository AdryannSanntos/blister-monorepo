import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-[var(--r-full)] border border-transparent px-2.5 text-[11.5px] font-bold whitespace-nowrap transition-[background,color,border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary-600)] text-white [a&]:hover:bg-[var(--primary-700)]",
        secondary:
          "bg-[var(--bg-sunken)] text-[var(--fg-secondary)] [a&]:hover:bg-[var(--bg-hover)]",
        destructive:
          "bg-[var(--danger-soft)] text-[var(--danger-soft-text)] [a&]:hover:bg-[var(--danger-soft)]",
        outline:
          "border-[var(--line-default)] text-[var(--fg-secondary)] [a&]:hover:bg-[var(--bg-sunken)]",
        ghost:
          "[a&]:hover:bg-[var(--bg-sunken)] [a&]:hover:text-[var(--fg-primary)]",
        link: "text-[var(--accent-soft-text)] underline-offset-4 [a&]:hover:underline",
        success:
          "bg-[var(--success-soft)] text-[var(--success-soft-text)]",
        warning:
          "bg-[var(--warning-soft)] text-[var(--warning-soft-text)]",
        info: "bg-[var(--info-soft)] text-[var(--info-soft-text)]",
        accent:
          "bg-[var(--accent-soft)] text-[var(--accent-soft-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
