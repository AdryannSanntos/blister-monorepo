"use client";

import {
  Coins,
  KeyRound,
  LayoutDashboard,
  Library,
  Scissors,
  Settings,
  Sparkles,
  Store,
  Upload,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useCutsPendingCount } from "src/core/modules/agents/hooks/use-cuts-runs";
import { buildAgentSidebarItem } from "src/core/modules/agents/utils/build-agent-sidebar-item";
import {
  AGENTS_CATALOG,
  DEFAULT_AGENT_IDS,
} from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { useLibraryItems } from "src/core/modules/marketplace/hooks/use-marketplace-mock";
import type { SidebarGroupDef } from "src/core/shared/components/ui/app-sidebar";

const STUDIO_ICONS = {
  cuts: Scissors,
} as const;

export function useDashboardNavGroups(): SidebarGroupDef[] {
  const t = useTranslations("sidebar");
  const tNav = useTranslations("agents.nav");
  const { pendingCount: cutsPendingCount } = useCutsPendingCount();
  const { data: libraryItems = [] } = useLibraryItems();
  const ownedCount = libraryItems.length;
  const ownedAgentIds = libraryItems
    .filter((item) => item.type === "agent" && item.agentId)
    .map((item) => item.agentId as string);

  const marketplaceAgents = useMemo(
    () =>
      AGENTS_CATALOG.filter(
        (agent) =>
          agent.tier === "marketplace" && ownedAgentIds.includes(agent.id),
      ),
    [ownedAgentIds],
  );

  return useMemo(
    () => [
      {
        items: [
          {
            label: t("home"),
            href: "/dashboard",
            icon: LayoutDashboard,
            match: (pathname: string) => pathname === "/dashboard",
          },
        ],
      },
      {
        label: t("archive"),
        collapsible: false,
        items: [
          {
            label: t("marketplace"),
            icon: Store,
            href: "/dashboard/marketplace",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/marketplace"),
          },
          {
            label: t("library"),
            icon: Library,
            href: "/dashboard/library",
            badge: { value: String(ownedCount), tone: "neutral" as const },
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/library"),
          },
          {
            label: t("files"),
            icon: Upload,
            href: "/dashboard/files",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/files"),
          },
        ],
      },
      {
        label: t("agents"),
        collapsible: true,
        items: DEFAULT_AGENT_IDS.map((agentId) => {
          const agent = AGENTS_CATALOG.find((entry) => entry.id === agentId);
          if (!agent) return null;
          const Icon =
            STUDIO_ICONS[agentId as keyof typeof STUDIO_ICONS] ?? Sparkles;
          return buildAgentSidebarItem({
            agent,
            icon: Icon,
            tNav,
            cutsPendingCount:
              agent.id === "cuts" ? cutsPendingCount : undefined,
          });
        }).filter(Boolean) as SidebarGroupDef["items"],
      },
      ...(marketplaceAgents.length > 0
        ? [
            {
              label: t("content"),
              collapsible: false,
              items: marketplaceAgents.map((agent) =>
                buildAgentSidebarItem({
                  agent,
                  icon: agent.icon,
                  tNav,
                }),
              ),
            } satisfies SidebarGroupDef,
          ]
        : []),
      {
        collapsible: false,
        pinBottom: true,
        items: [
          {
            label: t("settings"),
            href: "/dashboard/settings",
            icon: Settings,
            match: (pathname: string) =>
              pathname === "/dashboard/settings" ||
              pathname.startsWith("/dashboard/settings/") ||
              pathname.startsWith("/dashboard/workspace/settings"),
          },
          {
            label: t("team"),
            href: "/dashboard/workspace/team",
            icon: Users,
            permission: "member.read",
            companyOnly: true,
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/workspace/team"),
          },
          {
            label: t("permissions"),
            href: "/dashboard/workspace/permissions",
            icon: KeyRound,
            permission: "role.read",
            companyOnly: true,
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/workspace/permissions"),
          },
          {
            label: t("credits"),
            href: "/dashboard/credits",
            icon: Coins,
            permission: "credit.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/credits"),
          },
        ],
      },
    ],
    [cutsPendingCount, marketplaceAgents, ownedCount, t, tNav],
  );
}
