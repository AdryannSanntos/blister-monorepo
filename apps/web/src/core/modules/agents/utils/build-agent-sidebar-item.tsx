"use client";

import {
  History,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { AgentCatalogEntry } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import {
  getAgentHistoryPath,
  getAgentOverviewPath,
  getAgentResultsPath,
  getAgentSettingsPath,
  matchAgentHistoryPath,
  matchAgentOverviewPath,
  matchAgentPath,
  matchAgentResultsPath,
  matchAgentSettingsPath,
} from "src/core/modules/agents/utils/agent-paths";
import type { SidebarItemDef } from "src/core/shared/components/ui/app-sidebar";

type BuildAgentSidebarItemParams = {
  agent: AgentCatalogEntry;
  icon: LucideIcon;
  tNav: ReturnType<typeof useTranslations<"agents.nav">>;
  badge?: SidebarItemDef["badge"];
  cutsPendingCount?: number;
};

export const buildAgentSidebarItem = ({
  agent,
  icon,
  tNav,
  badge,
  cutsPendingCount = 0,
}: BuildAgentSidebarItemParams): SidebarItemDef => {
  const hasPendingCuts = agent.id === "cuts" && cutsPendingCount > 0;
  const pendingBadge = hasPendingCuts
    ? { value: String(cutsPendingCount), tone: "warning" as const }
    : badge;

  return {
    id: agent.id,
    label: agent.name,
    icon,
    href: getAgentOverviewPath(agent.routeSlug),
    badge: pendingBadge,
    match: (pathname) => matchAgentPath(pathname, agent.routeSlug),
    subItems: [
      {
        id: `${agent.id}-overview`,
        label: tNav("overview"),
        icon: LayoutDashboard,
        href: getAgentOverviewPath(agent.routeSlug),
        match: (pathname) => matchAgentOverviewPath(pathname, agent.routeSlug),
      },
      ...(agent.id === "cuts"
        ? [
            {
              id: `${agent.id}-results`,
              label: tNav("results"),
              icon: History,
              href: getAgentResultsPath(agent.routeSlug),
              match: (pathname: string) => matchAgentResultsPath(pathname, agent.routeSlug),
              statusTone: hasPendingCuts ? ("warning" as const) : undefined,
            },
          ]
        : [
            {
              id: `${agent.id}-history`,
              label: tNav("history"),
              icon: History,
              href: getAgentHistoryPath(agent.routeSlug),
              match: (pathname: string) => matchAgentHistoryPath(pathname, agent.routeSlug),
            },
          ]),
      {
        id: `${agent.id}-settings`,
        label: tNav("settings"),
        icon: Settings,
        href: getAgentSettingsPath(agent.routeSlug),
        match: (pathname) => matchAgentSettingsPath(pathname, agent.routeSlug),
      },
    ],
  };
};
