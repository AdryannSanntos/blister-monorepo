"use client";

import type { ReactNode } from "react";

import { AdminShell } from "src/core/modules/platform-admin/components/admin-shell";

export default function WorkspacesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
