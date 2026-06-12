"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { parseAgentRouteSlug } from "src/core/modules/agents/utils/agent-paths";
import { CutsRunModalProvider } from "src/core/modules/agents/components/cuts/cuts-run-modal-provider";
import { useDashboardNavGroups } from "src/core/modules/dashboard/hooks/use-dashboard-nav-groups";
import { AppShell } from "src/core/shared/components/app-shell";

import { usePathname } from "@/i18n/routing";

type DashboardShellProps = {
  children: ReactNode;
};

const AGENT_ROUTE_PREFIX = "/dashboard/agents/";

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("sidebar");
  const tAgentsNav = useTranslations("agents.nav");
  const navGroups = useDashboardNavGroups();

  const currentPageTitle = useMemo(() => {
    if (pathname === "/dashboard") return null;

    if (pathname.startsWith(AGENT_ROUTE_PREFIX)) {
      const slug = parseAgentRouteSlug(pathname);
      const agent = slug ? getAgentByRouteSlug(slug) : undefined;
      if (!agent) return null;

      if (pathname.endsWith("/history")) {
        return `${agent.name} · ${tAgentsNav("history")}`;
      }
      if (pathname.endsWith("/new")) {
        return `${agent.name} · ${tAgentsNav("newGeneration")}`;
      }
      if (pathname.endsWith("/settings")) {
        return `${agent.name} · ${tAgentsNav("settings")}`;
      }
      if (pathname.endsWith("/overview") || pathname === `/dashboard/agents/${slug}`) {
        return `${agent.name} · ${tAgentsNav("overview")}`;
      }

      return agent.name;
    }

    if (pathname.startsWith("/dashboard/marketplace")) return tSidebar("marketplace");
    if (pathname.startsWith("/dashboard/library")) return tSidebar("library");
    if (pathname.startsWith("/dashboard/files")) return tSidebar("files");
    if (pathname.startsWith("/dashboard/settings")) return tSidebar("settings");
    if (pathname.startsWith("/dashboard/credits")) return tSidebar("credits");
    if (pathname.startsWith("/dashboard/history")) return tSidebar("history");
    if (pathname.startsWith("/dashboard/workspace/team")) return tSidebar("team");
    if (pathname.startsWith("/dashboard/workspace/permissions"))
      return tSidebar("permissions");
    if (pathname.startsWith("/dashboard/workspace/settings"))
      return tSidebar("settings");
    if (pathname.startsWith("/dashboard/account/settings")) return t("settings");

    return null;
  }, [pathname, t, tAgentsNav, tSidebar]);

  return (
    <CutsRunModalProvider>
      <AppShell
        contentId="dashboard-content"
        navGroups={navGroups}
        breadcrumb={{
          homeLabel: t("home"),
          homeHref: "/dashboard",
          currentPageTitle,
        }}
      >
        {children}
      </AppShell>
    </CutsRunModalProvider>
  );
}
