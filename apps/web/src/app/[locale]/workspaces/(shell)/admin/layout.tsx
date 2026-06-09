"use client";

import type { ReactNode } from "react";

import { PlatformAdminShell } from "src/core/modules/platform-admin/components/platform-admin-shell";

export default function WorkspacesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
