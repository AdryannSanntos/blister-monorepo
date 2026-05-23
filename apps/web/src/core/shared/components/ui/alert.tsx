import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

const alertVariants = cva(
  [
    "relative grid w-full gap-x-3 gap-y-0.5 rounded-[var(--r-md)] p-3 text-[13px] leading-5",
    "transition-[background,border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
    "grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=alert-action]]:grid-cols-[auto_minmax(0,1fr)_auto]",
    "[&>svg]:pointer-events-none [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:row-span-2",
    "[&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-[var(--line-default)] bg-[var(--bg-raised)] text-[var(--fg-primary)] [&>svg]:text-[var(--fg-tertiary)]",
        info: [
          "rounded-r-[var(--r-md)] border border-[var(--line-subtle)] border-l-[3px] border-l-[var(--info)]",
          "bg-[var(--bg-raised)] text-[var(--fg-primary)] [&>svg]:text-[var(--info)]",
        ].join(" "),
        accent:
          "border border-[color-mix(in_oklch,var(--accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--fg-primary)] [&>svg]:text-[var(--accent)]",
        success:
          "border border-[color-mix(in_oklch,var(--success)_45%,transparent)] bg-[color-mix(in_oklch,var(--success)_10%,transparent)] text-[var(--fg-primary)] [&>svg]:text-[var(--success)]",
        warning:
          "border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_10%,transparent)] text-[var(--fg-primary)] [&>svg]:text-[var(--warning)]",
        destructive:
          "border border-[color-mix(in_oklch,var(--danger)_45%,transparent)] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] text-[var(--fg-primary)] [&>svg]:text-[var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn("group/alert", alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 row-start-1 min-w-0 font-medium tracking-[-0.01em] text-[var(--fg-primary)]",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 row-start-1 min-w-0 text-[12.5px] leading-[1.5] text-[var(--fg-tertiary)]",
        "group-has-[[data-slot=alert-title]]/alert:row-start-2",
        "[&_a]:text-[var(--accent)] [&_a]:underline-offset-2 [&_a]:hover:underline [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-3 row-start-1 row-span-2 flex shrink-0 items-center self-center",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants };
