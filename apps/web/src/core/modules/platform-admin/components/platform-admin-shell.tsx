"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { PlatformAdminHeader } from "./platform-admin-header";
import { PlatformAdminTabs } from "./platform-admin-tabs";
import { usePlatformRoleAccess } from "../hooks/use-platform-admin";

export function PlatformAdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { canAccessPlatformAdmin, isLoading } = usePlatformRoleAccess();

  useEffect(() => {
    if (!isLoading && !canAccessPlatformAdmin) {
      router.replace("/workspaces");
    }
  }, [canAccessPlatformAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full max-w-3xl" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!canAccessPlatformAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PlatformAdminHeader />
      <PlatformAdminTabs />
      {children}
    </div>
  );
}
