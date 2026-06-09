"use client";

import type { ReactNode } from "react";

import { WorkspacesShell } from "src/core/modules/workspaces/components/workspaces-shell";

export default function WorkspacesShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspacesShell>{children}</WorkspacesShell>;
}
