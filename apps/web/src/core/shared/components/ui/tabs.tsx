"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "src/core/shared/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=underline]:rounded-none data-[variant=pill]:h-auto data-[variant=pill]:rounded-none",
  {
    variants: {
      variant: {
        normal: "items-center bg-muted",
        pill: "items-center justify-start gap-1.5 rounded-none border-0 bg-transparent p-0 [&_[data-slot=tabs-trigger]]:border [&_[data-slot=tabs-trigger]]:border-solid [&_[data-slot=tabs-trigger]]:border-transparent [&_[data-slot=tabs-trigger][data-state=active]]:!border-primary [&_[data-slot=tabs-trigger]]:shadow-none",
        underline:
          "relative h-auto w-full items-end justify-start gap-0 rounded-none border-0 bg-transparent p-0 pb-px text-[var(--fg-tertiary)] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-0 after:h-px after:bg-[var(--line-default)] after:content-['']",
      },
    },
    defaultVariants: {
      variant: "normal",
    },
  },
);

function TabsList({
  className,
  variant = "normal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // base — variant normal
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=normal]/tabs-list:data-[state=active]:bg-background group-data-[variant=normal]/tabs-list:data-[state=active]:text-foreground group-data-[variant=normal]/tabs-list:data-[state=active]:shadow-sm",
        // pill variant
        "group-data-[variant=pill]/tabs-list:h-auto group-data-[variant=pill]/tabs-list:min-h-0 group-data-[variant=pill]/tabs-list:flex-none group-data-[variant=pill]/tabs-list:rounded-full group-data-[variant=pill]/tabs-list:bg-transparent group-data-[variant=pill]/tabs-list:px-3 group-data-[variant=pill]/tabs-list:py-1.5 group-data-[variant=pill]/tabs-list:text-[13px] group-data-[variant=pill]/tabs-list:font-medium group-data-[variant=pill]/tabs-list:text-[var(--fg-tertiary)] group-data-[variant=pill]/tabs-list:transition-[background,color,border-color] group-data-[variant=pill]/tabs-list:duration-[var(--dur-fast)] group-data-[variant=pill]/tabs-list:hover:bg-[var(--bg-sunken)] group-data-[variant=pill]/tabs-list:hover:text-[var(--fg-primary)] group-data-[variant=pill]/tabs-list:data-[state=active]:bg-[var(--accent-soft)] group-data-[variant=pill]/tabs-list:data-[state=active]:text-[var(--accent-soft-text)] group-data-[variant=pill]/tabs-list:data-[state=active]:font-semibold",
        // underline variant
        "group-data-[variant=underline]/tabs-list:relative group-data-[variant=underline]/tabs-list:h-auto group-data-[variant=underline]/tabs-list:min-h-0 group-data-[variant=underline]/tabs-list:flex-none group-data-[variant=underline]/tabs-list:items-end group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:border-0 group-data-[variant=underline]/tabs-list:bg-transparent group-data-[variant=underline]/tabs-list:justify-start",
        "group-data-[variant=underline]/tabs-list:px-3 group-data-[variant=underline]/tabs-list:pt-0 group-data-[variant=underline]/tabs-list:pb-2",
        "group-data-[variant=underline]/tabs-list:text-[13px] group-data-[variant=underline]/tabs-list:text-[var(--fg-tertiary)]",
        "group-data-[variant=underline]/tabs-list:transition-[color] group-data-[variant=underline]/tabs-list:duration-[var(--dur-fast)]",
        "group-data-[variant=underline]/tabs-list:hover:text-[var(--fg-primary)]",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline]/tabs-list:data-[state=active]:text-[var(--accent-soft-text)] group-data-[variant=underline]/tabs-list:data-[state=active]:font-bold",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:after:pointer-events-none group-data-[variant=underline]/tabs-list:data-[state=active]:after:absolute group-data-[variant=underline]/tabs-list:data-[state=active]:after:-bottom-px group-data-[variant=underline]/tabs-list:data-[state=active]:after:left-0 group-data-[variant=underline]/tabs-list:data-[state=active]:after:right-0 group-data-[variant=underline]/tabs-list:data-[state=active]:after:z-[1] group-data-[variant=underline]/tabs-list:data-[state=active]:after:h-0.5 group-data-[variant=underline]/tabs-list:data-[state=active]:after:bg-[var(--accent)] group-data-[variant=underline]/tabs-list:data-[state=active]:after:content-['']",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
