"use client";

import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import { cn } from "src/core/shared/utils";

type SectionCardProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  iconSurfaceClassName?: string;
  titleClassName?: string;
};

export function SectionCard({
  icon,
  title,
  description,
  children,
  className,
  iconClassName,
  iconSurfaceClassName,
  titleClassName,
}: SectionCardProps) {
  return (
    <Card
      className={cn("border-[var(--line-default)] bg-[var(--bg-base)]", className)}
    >
      <CardHeader className="flex flex-row items-start gap-4 p-6">
        <SurfaceIcon
          icon={icon}
          className={iconSurfaceClassName}
          iconClassName={iconClassName}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle
            className={cn(
              "text-[16px] font-medium text-[var(--fg-primary)]",
              titleClassName,
            )}
          >
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="text-[13px] text-[var(--fg-tertiary)]">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">{children}</CardContent>
    </Card>
  );
}
