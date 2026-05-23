"use client";

import type * as React from "react";
import {
  Check,
  Info,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "src/core/shared/utils";

function ToastToneIcon({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error" | "info" | "loading";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[color-mix(in_oklch,var(--success)_16%,transparent)] text-[var(--success)]"
      : tone === "warning"
        ? "bg-[color-mix(in_oklch,var(--warning)_16%,transparent)] text-[var(--warning)]"
        : tone === "error"
          ? "bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]"
          : tone === "info"
            ? "bg-[color-mix(in_oklch,var(--info)_16%,transparent)] text-[var(--info)]"
            : "bg-[var(--bg-hover)] text-[var(--fg-tertiary)]";

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={16}
      gap={10}
      icons={{
        success: (
          <ToastToneIcon tone="success">
            <Check className="size-3.5" strokeWidth={2.25} />
          </ToastToneIcon>
        ),
        info: (
          <ToastToneIcon tone="info">
            <Info className="size-3.5" strokeWidth={2.25} />
          </ToastToneIcon>
        ),
        warning: (
          <ToastToneIcon tone="warning">
            <TriangleAlert className="size-3.5" strokeWidth={2.25} />
          </ToastToneIcon>
        ),
        error: (
          <ToastToneIcon tone="error">
            <X className="size-3.5" strokeWidth={2.25} />
          </ToastToneIcon>
        ),
        loading: (
          <ToastToneIcon tone="loading">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
          </ToastToneIcon>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "ds-sonner-toast",
          title: "ds-sonner-title",
          description: "ds-sonner-description",
          actionButton: "ds-sonner-action",
          cancelButton: "ds-sonner-cancel",
          closeButton: "ds-sonner-close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
