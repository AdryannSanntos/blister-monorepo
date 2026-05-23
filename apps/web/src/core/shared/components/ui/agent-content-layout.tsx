import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "src/core/shared/utils";

type AgentContentLayoutProps = {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AgentContentLayout({
  icon: Icon,
  title,
  subtitle,
  actions,
  banner,
  children,
  className,
  contentClassName,
}: AgentContentLayoutProps) {
  return (
    <div className={cn("flex h-full min-w-0 w-full flex-col", className)}>
      {banner}

      <header className="flex h-[82px] shrink-0 items-center border-b border-[var(--line-subtle)] px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-medium text-[var(--fg-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <div className="mt-0.5 truncate text-[12px] text-[var(--fg-tertiary)]">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>

      <div className={cn("min-h-0 w-full flex-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
