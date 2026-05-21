"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-[var(--line-default)] bg-[var(--bg-active)] shadow-none outline-none transition-[background,border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:border-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[18px] data-[size=default]:w-[30px] data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--accent)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none ml-px block rounded-full bg-[var(--fg-secondary)] ring-0 transition-[background,transform] duration-[var(--dur-base)] ease-[var(--ease-spring)] group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-3 data-[state=checked]:bg-[var(--fg-on-accent)] data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
