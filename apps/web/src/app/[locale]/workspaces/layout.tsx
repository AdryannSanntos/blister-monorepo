"use client";

import type { ReactNode } from "react";

import { AuthGuard } from "src/core/shared/components/auth-guard";

export default function WorkspacesLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
