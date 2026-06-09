import type { LucideIcon } from "lucide-react";

import { cn } from "@/core/shared/utils";
import { SurfaceIcon } from "@/core/shared/components/ui/surface-icon";

interface PageLayoutProps {
  title: string;
  description?: React.ReactNode;
  icon: LucideIcon;
  actions?: React.ReactNode;
  afterHeader?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  icon,
  actions,
  afterHeader,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <SurfaceIcon icon={icon} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {afterHeader}
      {children}
    </div>
  );
}
