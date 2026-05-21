import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-[var(--r-md)] border border-transparent font-normal tracking-[-0.005em] outline-none transition-[background,color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--accent-soft-hi)_inset,0_1px_0_0_oklch(1_0_0_/_0.1)_inset,0_4px_16px_color-mix(in_oklch,var(--accent)_16%,transparent)] hover:bg-[var(--accent-hover)] focus-visible:ring-[3px] focus-visible:ring-ring/50",
        flat: "bg-primary text-primary-foreground hover:bg-[var(--accent-hover)] focus-visible:ring-[3px] focus-visible:ring-ring/50",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-[3px] focus-visible:ring-destructive/30",
        outline:
          "border-[var(--line-strong)] bg-[var(--bg-sunken)] text-[var(--fg-primary)] shadow-[var(--shadow-xs)] hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]",
        secondary:
          "border-[var(--line-default)] bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)] hover:bg-[var(--bg-hover)]",
        ghost:
          "text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        md: "h-9 px-4 text-[13.5px] has-[>svg]:px-3.5",
        default: "h-9 px-4 text-[13.5px] has-[>svg]:px-3.5",
        xs: "h-6 gap-[5px] rounded-[var(--r-sm)] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[12.5px] has-[>svg]:px-2.5",
        lg: "h-10 rounded-[var(--r-md)] px-4 text-sm has-[>svg]:px-4",
        xl: "h-12 rounded-[var(--r-lg)] px-5 text-[15px] has-[>svg]:px-5",
        icon: "h-9 w-9",
        "icon-xs":
          "size-6 rounded-[var(--r-sm)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
