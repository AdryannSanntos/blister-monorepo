"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "src/core/modules/dashboard/components/dashboard-shell";

export default function DashboardShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
