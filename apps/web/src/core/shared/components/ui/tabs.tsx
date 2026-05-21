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
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=underline]:rounded-none",
  {
    variants: {
      variant: {
        normal: "bg-muted",
        underline:
          "h-auto w-full justify-start gap-1 rounded-none border-b border-[var(--line-default)] bg-transparent p-0 text-[var(--fg-tertiary)]",
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
        // underline variant
        "group-data-[variant=underline]/tabs-list:h-10 group-data-[variant=underline]/tabs-list:flex-none group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:bg-transparent",
        "group-data-[variant=underline]/tabs-list:[border:none]",
        "group-data-[variant=underline]/tabs-list:px-3 group-data-[variant=underline]/tabs-list:py-0",
        "group-data-[variant=underline]/tabs-list:text-[13px] group-data-[variant=underline]/tabs-list:text-[var(--fg-tertiary)]",
        "group-data-[variant=underline]/tabs-list:transition-[color,box-shadow] group-data-[variant=underline]/tabs-list:duration-[var(--dur-fast)]",
        "group-data-[variant=underline]/tabs-list:hover:text-[var(--fg-primary)]",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline]/tabs-list:data-[state=active]:text-[var(--fg-primary)] group-data-[variant=underline]/tabs-list:data-[state=active]:font-medium group-data-[variant=underline]/tabs-list:data-[state=active]:shadow-[inset_0_-1px_0_var(--accent)]",
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
