"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "src/core/modules/dashboard/components/dashboard-shell";
import { AuthGuard } from "src/core/shared/components/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
