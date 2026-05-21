import { cn } from "@/core/shared/utils";

interface PageLayoutProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]",
              eyebrow && "mt-1",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-[680px] text-[14px] leading-[1.55] text-[var(--fg-tertiary)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
