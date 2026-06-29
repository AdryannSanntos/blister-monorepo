"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import {
  getAgentOverviewPath,
  getAgentSettingsPath,
  matchAgentRunPath,
  parseAgentRouteSlug,
} from "src/core/modules/agents/utils/agent-paths";
import { CarouselRunModalProvider } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { CutsRunModalProvider } from "src/core/modules/agents/components/cuts/cuts-run-modal-provider";
import { useDashboardNavGroups } from "src/core/modules/dashboard/hooks/use-dashboard-nav-groups";
import {
  AppShell,
  type AppShellBreadcrumbItem,
} from "src/core/shared/components/app-shell";

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

  const breadcrumbItems = useMemo((): AppShellBreadcrumbItem[] | null => {
    if (pathname === "/dashboard") return null;

    if (pathname.startsWith(AGENT_ROUTE_PREFIX)) {
      const slug = parseAgentRouteSlug(pathname);
      const agent = slug ? getAgentByRouteSlug(slug) : undefined;
      if (!agent || !slug) return null;

      const agentItem: AppShellBreadcrumbItem = {
        label: agent.name,
        href: getAgentOverviewPath(slug),
      };

      if (pathname.endsWith("/new")) {
        return [agentItem, { label: tAgentsNav("newGeneration") }];
      }
      if (pathname.endsWith("/settings")) {
        return [agentItem, { label: tAgentsNav("settings") }];
      }
      if (matchAgentRunPath(pathname, slug)) {
        return [
          agentItem,
          {
            label: tAgentsNav("overview"),
            href: getAgentOverviewPath(slug),
          },
          { label: tAgentsNav("runDetail") },
        ];
      }
      if (
        pathname.endsWith("/overview") ||
        pathname === `/dashboard/agents/${slug}`
      ) {
        return [agentItem, { label: tAgentsNav("overview") }];
      }

      return [{ label: agent.name }];
    }

    if (pathname.startsWith("/dashboard/marketplace")) {
      return [{ label: tSidebar("marketplace") }];
    }
    if (pathname.startsWith("/dashboard/library")) {
      return [{ label: tSidebar("library") }];
    }
    if (pathname.startsWith("/dashboard/files")) {
      return [{ label: tSidebar("files") }];
    }
    if (pathname.startsWith("/dashboard/projects")) {
      return [{ label: tSidebar("projects") }];
    }
    if (pathname.startsWith("/dashboard/settings")) {
      return [{ label: tSidebar("settings") }];
    }
    if (pathname.startsWith("/dashboard/credits")) {
      return [{ label: tSidebar("credits") }];
    }
    if (pathname.startsWith("/dashboard/workspace/team")) {
      return [{ label: tSidebar("team") }];
    }
    if (pathname.startsWith("/dashboard/workspace/permissions")) {
      return [{ label: tSidebar("permissions") }];
    }
    if (pathname.startsWith("/dashboard/workspace/settings")) {
      return [{ label: tSidebar("settings") }];
    }
    if (pathname.startsWith("/dashboard/account/settings")) {
      return [{ label: t("settings") }];
    }

    return null;
  }, [pathname, t, tAgentsNav, tSidebar]);

  return (
    <CutsRunModalProvider>
      <CarouselRunModalProvider>
        <AppShell
          contentId="dashboard-content"
          navGroups={navGroups}
          breadcrumb={{
            homeLabel: t("home"),
            homeHref: "/dashboard",
            items: breadcrumbItems ?? undefined,
          }}
        >
          {children}
        </AppShell>
      </CarouselRunModalProvider>
    </CutsRunModalProvider>
  );
}
