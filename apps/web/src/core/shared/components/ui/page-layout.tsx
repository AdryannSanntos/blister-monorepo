import { ArrowLeft, type LucideIcon } from "lucide-react";

import { Button } from "@/core/shared/components/ui/button";
import { Heading } from "@/core/shared/components/ui/heading";
import { Paragraph } from "@/core/shared/components/ui/paragraph";
import { SurfaceIcon } from "@/core/shared/components/ui/surface-icon";
import { cn } from "@/core/shared/utils";
import { Link } from "@/i18n/routing";

export type PageLayoutBackButton = {
  /** When set, navigates to this path. Otherwise `onBack` is used (e.g. router.back). */
  href?: string;
  onBack?: () => void;
  label: string;
};

interface PageLayoutProps {
  title: string;
  description?: React.ReactNode;
  icon: LucideIcon;
  actions?: React.ReactNode;
  afterHeader?: React.ReactNode;
  backButton?: PageLayoutBackButton;
  children: React.ReactNode;
  className?: string;
}

const PageLayoutBackButtonControl = ({
  backButton,
}: {
  backButton: PageLayoutBackButton;
}) => {
  const buttonClassName = "size-8 shrink-0";

  if (backButton.href) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonClassName}
        asChild
        data-testid="page-layout-back"
      >
        <Link href={backButton.href} aria-label={backButton.label}>
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={buttonClassName}
      aria-label={backButton.label}
      onClick={backButton.onBack}
      data-testid="page-layout-back"
    >
      <ArrowLeft className="size-4" aria-hidden />
    </Button>
  );
};

export function PageLayout({
  title,
  description,
  icon,
  actions,
  afterHeader,
  backButton,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backButton ? (
            <PageLayoutBackButtonControl backButton={backButton} />
          ) : null}
          <SurfaceIcon icon={icon} />
          <div className="min-w-0">
            <Heading level="h3" as="h1">
              {title}
            </Heading>
            {description && (
              <Paragraph className="mt-1">{description}</Paragraph>
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
