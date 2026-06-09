"use client";

import { type ReactNode, useEffect } from "react";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

import { useRouter } from "@/i18n/routing";

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
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!canAccessPlatformAdmin) {
    return null;
  }

  return children;
}
