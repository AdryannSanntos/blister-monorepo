import { memo } from "react";
import { cn } from "./utils/cn";

export type ErrorMessageProps = {
  title?: string;
  message: string;
  className?: string;
};

export const ErrorMessage = memo(function ErrorMessage({
  title = "Something went wrong",
  message,
  className,
}: ErrorMessageProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--danger)_30%,transparent)] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] px-4 py-2.5 text-[13px] text-[var(--fg-primary)]">
        <div className="font-medium text-[var(--fg-primary)]">{title}</div>
        <div className="mt-0.5 text-[var(--fg-tertiary)]">{message}</div>
      </div>
    </div>
  );
});
