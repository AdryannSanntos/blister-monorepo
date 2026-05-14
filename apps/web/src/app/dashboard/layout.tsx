"use client";

import type { ReactNode } from "react";

import { AuthGuard } from "src/core/shared/components/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
