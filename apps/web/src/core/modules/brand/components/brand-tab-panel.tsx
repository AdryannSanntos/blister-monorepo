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

type BrandTabPanelProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function BrandTabPanel({
  icon,
  title,
  description,
  children,
  footer,
}: BrandTabPanelProps) {
  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="flex flex-row items-start gap-4 p-6">
        <SurfaceIcon icon={icon} />
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="text-[13px] text-[var(--fg-tertiary)]">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-6 pb-6 pt-0">
        {children}
        {footer ? (
          <div className="flex justify-end border-t border-[var(--line-subtle)] pt-4">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
