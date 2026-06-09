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
        "peer group/switch inline-flex shrink-0 items-center rounded-full border-[1.5px] border-transparent bg-[var(--bg-active)] p-0.5 shadow-none outline-none transition-[background,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] focus-visible:border-[var(--primary-700)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[26px] data-[size=default]:w-[46px] data-[size=sm]:h-[20px] data-[size=sm]:w-[36px] data-[state=checked]:bg-[var(--primary-600)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[var(--shadow-sm)] ring-0 transition-[background,transform] duration-[var(--dur-base)] ease-[var(--ease-spring)] group-data-[size=default]/switch:size-[22px] group-data-[size=sm]/switch:size-4 data-[state=checked]:bg-white data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-5 group-data-[size=sm]/switch:data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
