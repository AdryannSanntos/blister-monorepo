"use client";

import { type ReactNode } from "react";

import { usePathname } from "@/i18n/routing";

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className={className}
      style={{ animation: "page-enter 0.3s ease-out both" }}
    >
      {children}
    </div>
  );
}
