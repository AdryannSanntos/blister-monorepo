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
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning)]"
        : tone === "error"
          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
          : tone === "info"
            ? "bg-[var(--info-soft)] text-[var(--info)]"
            : "bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]";

  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

const toastClassNames = {
  toast: cn(
    "ds-sonner-toast",
    "group/toast relative flex w-[min(360px,calc(100vw-2rem))] items-center gap-3",
    "has-[[data-description]]:items-start",
    "rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)]",
    "p-3.5 pr-10 shadow-[var(--shadow-md)]",
    "pointer-events-auto",
  ),
  content: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: cn(
    "ds-sonner-title",
    "text-[13px] leading-[1.45] font-medium tracking-[-0.01em] text-[var(--fg-primary)]",
    "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden",
  ),
  description: cn(
    "ds-sonner-description",
    "text-[12px] leading-[1.45] text-[var(--fg-tertiary)] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden",
  ),
  icon: "ds-sonner-icon shrink-0 group-has-[[data-description]]/toast:mt-0.5",
  closeButton: cn(
    "ds-sonner-close",
    "!absolute !top-2 !right-2 !left-auto",
    "flex size-7 items-center justify-center rounded-[var(--r-md)]",
    "border-0 bg-transparent text-[var(--fg-tertiary)]",
    "opacity-0 transition-[opacity,background,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
    "hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)]",
    "group-hover/toast:opacity-100 focus-visible:opacity-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
  ),
  actionButton: cn(
    "ds-sonner-action",
    "h-7 shrink-0 rounded-[var(--r-md)] bg-[var(--accent)] px-2.5",
    "text-[12px] font-medium text-[var(--fg-on-accent)]",
    "transition-colors duration-[var(--dur-fast)] hover:bg-[var(--accent-hover)]",
  ),
  cancelButton: cn(
    "ds-sonner-cancel",
    "h-7 shrink-0 rounded-[var(--r-md)] border border-[var(--line-default)] bg-transparent px-2.5",
    "text-[12px] font-medium text-[var(--fg-secondary)]",
    "transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]",
  ),
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={16}
      gap={10}
      visibleToasts={4}
      expand={false}
      richColors={false}
      closeButton
      icons={{
        success: (
          <ToastToneIcon tone="success">
            <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
          </ToastToneIcon>
        ),
        info: (
          <ToastToneIcon tone="info">
            <Info className="size-3.5" strokeWidth={2.25} aria-hidden />
          </ToastToneIcon>
        ),
        warning: (
          <ToastToneIcon tone="warning">
            <TriangleAlert className="size-3.5" strokeWidth={2.25} aria-hidden />
          </ToastToneIcon>
        ),
        error: (
          <ToastToneIcon tone="error">
            <X className="size-3.5" strokeWidth={2.25} aria-hidden />
          </ToastToneIcon>
        ),
        loading: (
          <ToastToneIcon tone="loading">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} aria-hidden />
          </ToastToneIcon>
        ),
        close: <X className="size-3.5" strokeWidth={2.25} aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        duration: 4_500,
        classNames: toastClassNames,
      }}
      {...props}
    />
  );
};

export { Toaster };
