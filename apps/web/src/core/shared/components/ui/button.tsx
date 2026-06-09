import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import {
  controlHeightClass,
  controlIconSizeClass,
} from "src/core/shared/styles/control-size";
import { cn } from "src/core/shared/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border-[1.5px] font-heading font-bold outline-none transition-[background,color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:border-[var(--line-subtle)] disabled:bg-[var(--bg-hover)] disabled:text-[var(--fg-quaternary)] disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_srgb,var(--primary-600)_72%,white)] bg-[var(--primary-600)] text-white hover:border-[color-mix(in_srgb,var(--primary-600)_58%,white)] hover:bg-[var(--primary-700)] active:border-[var(--primary-700)] active:bg-[var(--primary-800)] focus-visible:border-[color-mix(in_srgb,var(--primary-600)_58%,white)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft-hi)]",
        flat:
          "border-[color-mix(in_srgb,var(--primary-600)_72%,white)] bg-[var(--primary-600)] text-white hover:border-[color-mix(in_srgb,var(--primary-600)_58%,white)] hover:bg-[var(--primary-700)] active:border-[var(--primary-700)] active:bg-[var(--primary-800)] focus-visible:border-[color-mix(in_srgb,var(--primary-600)_58%,white)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft-hi)]",
        secondary:
          "border-[color-mix(in_srgb,var(--neutral-400)_28%,var(--bg-sunken))] bg-[var(--bg-sunken)] text-[var(--fg-primary)] hover:border-[color-mix(in_srgb,var(--neutral-400)_38%,var(--bg-sunken))] hover:bg-[var(--bg-hover)] active:border-[color-mix(in_srgb,var(--neutral-500)_42%,var(--bg-hover))] active:bg-[var(--bg-active)] focus-visible:border-[color-mix(in_srgb,var(--neutral-500)_42%,var(--bg-hover))] focus-visible:ring-[3px] focus-visible:ring-[var(--bg-hover)]",
        tertiary:
          "border-[color-mix(in_srgb,var(--neutral-400)_28%,var(--bg-sunken))] bg-[var(--bg-sunken)] text-[var(--fg-primary)] hover:border-[color-mix(in_srgb,var(--neutral-400)_38%,var(--bg-sunken))] hover:bg-[var(--bg-hover)] active:border-[color-mix(in_srgb,var(--neutral-500)_42%,var(--bg-hover))] active:bg-[var(--bg-active)] focus-visible:border-[color-mix(in_srgb,var(--neutral-500)_42%,var(--bg-hover))] focus-visible:ring-[3px] focus-visible:ring-[var(--bg-hover)]",
        brand:
          "border-[color-mix(in_srgb,var(--secondary-600)_72%,white)] bg-[var(--secondary-600)] text-white hover:border-[color-mix(in_srgb,var(--secondary-600)_58%,white)] hover:bg-[var(--secondary-700)] active:border-[var(--secondary-700)] active:bg-[var(--secondary-800)] focus-visible:border-[color-mix(in_srgb,var(--secondary-600)_58%,white)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand-secondary-soft)]",
        outline:
          "border-[var(--line-default)] bg-transparent text-[var(--fg-primary)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-sunken)] active:border-[var(--line-strong)] active:bg-[var(--bg-hover)] focus-visible:border-[var(--line-strong)] focus-visible:ring-[3px] focus-visible:ring-[var(--bg-hover)]",
        ghost:
          "border-0 bg-transparent text-[var(--fg-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--fg-primary)] active:bg-[var(--bg-hover)] focus-visible:ring-[3px] focus-visible:ring-[var(--bg-hover)]",
        destructive:
          "border-[color-mix(in_srgb,var(--error-600)_72%,white)] bg-[var(--error-600)] text-white hover:border-[color-mix(in_srgb,var(--error-600)_58%,white)] hover:bg-[var(--error-700)] active:border-[var(--error-700)] active:bg-[var(--error-800)] focus-visible:border-[color-mix(in_srgb,var(--error-600)_58%,white)] focus-visible:ring-[3px] focus-visible:ring-[var(--danger-soft)]",
        link: "border-0 text-[var(--accent-soft-text)] underline-offset-4 hover:underline",
      },
      size: {
        md: `${controlHeightClass.md} px-[18px] text-sm has-[>svg]:px-4`,
        default: `${controlHeightClass.md} px-[18px] text-sm has-[>svg]:px-4`,
        xs: `${controlHeightClass.xs} gap-1.5 rounded-[var(--r-sm)] px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5`,
        sm: `${controlHeightClass.sm} gap-1.5 rounded-[9px] px-[13px] text-[13px] has-[>svg]:px-2.5`,
        lg: `${controlHeightClass.lg} rounded-[13px] px-6 text-[15px] has-[>svg]:px-5`,
        xl: `${controlHeightClass.xl} rounded-[var(--r-lg)] px-7 text-base has-[>svg]:px-6`,
        icon: controlIconSizeClass.md,
        "icon-xs": `${controlIconSizeClass.xs} rounded-[var(--r-sm)] [&_svg:not([class*='size-'])]:size-3.5`,
        "icon-sm": `${controlIconSizeClass.sm} rounded-[var(--r-sm)]`,
        "icon-lg": `${controlIconSizeClass.lg} rounded-[var(--r-lg)]`,
        "icon-xl": `${controlIconSizeClass.xl} rounded-[var(--r-lg)]`,
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
