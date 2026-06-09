"use client";

import { CircleIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-5 shrink-0 rounded-full border-[1.5px] border-[var(--line-strong)] bg-[var(--bg-base)] text-white shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--primary-400)] focus-visible:border-[var(--primary-700)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:border-[var(--line-default)] disabled:bg-[var(--bg-sunken)] disabled:opacity-60 aria-invalid:border-[var(--danger)] aria-invalid:focus-visible:ring-[3px] aria-invalid:focus-visible:ring-[var(--danger-soft)] data-[state=checked]:border-[var(--primary-600)] data-[state=checked]:bg-[var(--primary-600)]",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-white text-white" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
