"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";
import { getDashboardAgentBreadcrumbKey } from "src/core/modules/dashboard/config/dashboard-agents";
import { useDashboardNavGroups } from "src/core/modules/dashboard/hooks/use-dashboard-nav-groups";
import { useHomeDestination } from "src/core/modules/workspaces/hooks/use-companies";
import { AppShell } from "src/core/shared/components/app-shell";
import { Button } from "src/core/shared/components/ui/button";

import { Link, usePathname } from "@/i18n/routing";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("sidebar");
  const { data: homeDestination } = useHomeDestination();
  const navGroups = useDashboardNavGroups();

  const activeAgentKey = getDashboardAgentBreadcrumbKey(pathname);

  const currentPageTitle = useMemo(() => {
    if (pathname === "/dashboard") return null;
    if (pathname.startsWith("/dashboard/brand")) return tSidebar("brandBrain");
    const agentLabelKey = getDashboardAgentBreadcrumbKey(pathname);
    if (agentLabelKey) return tSidebar(agentLabelKey);
    if (pathname.startsWith("/dashboard/campaigns"))
      return tSidebar("campaigns");
    if (pathname.startsWith("/dashboard/pieces")) return tSidebar("history");
    if (pathname.startsWith("/dashboard/credits")) return tSidebar("credits");
    if (pathname.startsWith("/dashboard/workspace/team"))
      return tSidebar("team");
    if (pathname.startsWith("/dashboard/workspace/permissions"))
      return tSidebar("permissions");
    if (pathname.startsWith("/dashboard/workspace/settings"))
      return tSidebar("settings");
    if (pathname.startsWith("/dashboard/account/settings"))
      return t("settings");
    return null;
  }, [pathname, t, tSidebar]);

  return (
    <AppShell
      contentId="dashboard-content"
      navGroups={navGroups}
      breadcrumb={{
        homeLabel: t("home"),
        homeHref: "/dashboard",
        currentPageTitle,
      }}
      focusCollapseKey={activeAgentKey}
      headerEnd={
        homeDestination?.destination === "workspaces" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/workspaces">{tSidebar("company")}</Link>
          </Button>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
