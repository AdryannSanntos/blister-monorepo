import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

const alertVariants = cva(
  [
    "relative grid w-full gap-x-3 gap-y-0.5 rounded-[var(--r-lg)] p-4 text-[13px] leading-5",
    "transition-[background,border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
    "grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=alert-action]]:grid-cols-[auto_minmax(0,1fr)_auto]",
    "[&>svg]:pointer-events-none [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:row-span-2",
    "[&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-[var(--line-default)] bg-[var(--bg-raised)] text-[var(--fg-primary)] [&>svg]:text-[var(--fg-tertiary)]",
        info: "bg-[var(--info-soft)] text-[var(--fg-primary)] [&_[data-slot=alert-title]]:text-[var(--info-soft-text)] [&>svg]:text-[var(--info)]",
        accent:
          "bg-[var(--accent-soft)] text-[var(--fg-primary)] [&_[data-slot=alert-title]]:text-[var(--accent-soft-text)] [&>svg]:text-[var(--accent)]",
        success:
          "bg-[var(--success-soft)] text-[var(--fg-primary)] [&_[data-slot=alert-title]]:text-[var(--success-soft-text)] [&>svg]:text-[var(--success)]",
        warning:
          "bg-[var(--warning-soft)] text-[var(--fg-primary)] [&_[data-slot=alert-title]]:text-[var(--warning-soft-text)] [&>svg]:text-[var(--warning)]",
        destructive:
          "bg-[var(--danger-soft)] text-[var(--fg-primary)] [&_[data-slot=alert-title]]:text-[var(--danger-soft-text)] [&>svg]:text-[var(--danger)]",
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
