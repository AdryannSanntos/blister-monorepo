"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo } from "react";
import { AppShell } from "src/core/shared/components/app-shell";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

import { usePathname, useRouter } from "@/i18n/routing";

import { useAdminNavGroups } from "../hooks/use-admin-nav-groups";
import { usePlatformRoleAccess } from "../hooks/use-platform-admin";
import { usePlatformAdminNavItems } from "./platform-admin-primitives";
import { usePlatformAdminTab } from "../hooks/use-platform-admin-tab";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessPlatformAdmin, isLoading } = usePlatformRoleAccess();
  const tSidebar = useTranslations("sidebar");
  const navGroups = useAdminNavGroups();
  const [tab] = usePlatformAdminTab();
  const platformNavItems = usePlatformAdminNavItems();

  useEffect(() => {
    if (!isLoading && !canAccessPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [canAccessPlatformAdmin, isLoading, router]);

  const currentPageTitle = useMemo(() => {
    if (pathname !== "/admin" || tab === "overview") return null;
    return platformNavItems.find((item) => item.value === tab)?.label ?? null;
  }, [pathname, platformNavItems, tab]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex w-full max-w-3xl flex-col gap-4 p-6">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!canAccessPlatformAdmin) {
    return null;
  }

  return (
    <AppShell
      contentId="admin-content"
      navGroups={navGroups}
      breadcrumb={{
        homeLabel: tSidebar("admin"),
        homeHref: "/admin",
        currentPageTitle,
      }}
    >
      {children}
    </AppShell>
  );
}
