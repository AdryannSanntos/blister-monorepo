"use client";

import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-[6px] border-[1.5px] border-[var(--line-strong)] bg-[var(--bg-base)] text-white shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--primary-400)] focus-visible:border-[var(--primary-700)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:border-[var(--line-default)] disabled:bg-[var(--bg-sunken)] disabled:opacity-60 aria-invalid:border-[var(--danger)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--danger-soft)] data-[state=checked]:border-[var(--primary-600)] data-[state=checked]:bg-[var(--primary-600)] data-[state=indeterminate]:border-[var(--primary-600)] data-[state=indeterminate]:bg-[var(--primary-600)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
