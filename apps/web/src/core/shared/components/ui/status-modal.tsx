"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import { cn } from "src/core/shared/utils";

export type StatusModalVariant = "success" | "error" | "alert";

export type StatusModalAction = {
  label: string;
  onClick: () => void;
  testId?: string;
  disabled?: boolean;
};

type StatusModalProps = {
  open: boolean;
  variant: StatusModalVariant;
  title: string;
  description: ReactNode;
  /** Optional body below description — omit for simple status feedback (e.g. agent run started). */
  children?: ReactNode;
  primaryAction?: StatusModalAction;
  secondaryAction?: StatusModalAction;
  onClose: () => void;
  testId?: string;
};

const variantConfig: Record<
  StatusModalVariant,
  { icon: LucideIcon; surfaceClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    surfaceClassName:
      "bg-[var(--success-soft)] text-[var(--success)]",
  },
  error: {
    icon: AlertCircle,
    surfaceClassName: "bg-[var(--danger-soft)] text-[var(--danger)]",
  },
  alert: {
    icon: AlertTriangle,
    surfaceClassName:
      "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
};

export const StatusModal = ({
  open,
  variant,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  testId = "status-modal",
}: StatusModalProps) => {
  const { icon, surfaceClassName } = variantConfig[variant];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        data-testid={testId}
        data-variant={variant}
        className="max-w-md gap-6"
        showCloseButton
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <SurfaceIcon
            icon={icon}
            className={cn("size-14 rounded-[var(--r-lg)]", surfaceClassName)}
            iconClassName="size-7"
            aria-hidden
          />

          <DialogHeader className="items-center gap-2 sm:text-center">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {children ? (
          <div className="flex flex-col gap-3">{children}</div>
        ) : null}

        {primaryAction || secondaryAction ? (
          <DialogFooter className="gap-2 sm:justify-end">
            {secondaryAction ? (
              <Button
                type="button"
                variant="outline"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                data-testid={secondaryAction.testId}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                data-testid={primaryAction.testId}
              >
                {primaryAction.label}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
