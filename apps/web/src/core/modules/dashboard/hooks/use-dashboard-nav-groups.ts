"use client";

import {
  Brain,
  Coins,
  History,
  KeyRound,
  LayoutDashboard,
  Library,
  Settings,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useBrandBrainProgress } from "src/core/modules/brand/hooks/use-brand-brain-progress";
import { DASHBOARD_AGENT_NAV_ITEMS } from "src/core/modules/dashboard/config/dashboard-agents";
import { type SidebarGroupDef } from "src/core/shared/components/ui/app-sidebar";

export function useDashboardNavGroups(): SidebarGroupDef[] {
  const t = useTranslations("dashboard");
  const tSidebar = useTranslations("sidebar");
  const { statusTone: brandBrainStatusTone } = useBrandBrainProgress();

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
          {
            label: tSidebar("brandBrain"),
            href: "/dashboard/brand",
            icon: Brain,
            permission: "brand.read",
            match: (pathname: string) => pathname.startsWith("/dashboard/brand"),
            ...(brandBrainStatusTone
              ? { statusTone: brandBrainStatusTone }
              : {}),
          },
        ],
      },
      {
        label: tSidebar("agents"),
        collapsible: false,
        items: DASHBOARD_AGENT_NAV_ITEMS.map((agent) => ({
          id: agent.id,
          label: tSidebar(agent.labelKey),
          icon: agent.icon,
          href: agent.href,
          permission: "generation.create" as const,
          match: (pathname: string) => pathname.startsWith(agent.href),
        })),
      },
      {
        label: t("main"),
        collapsible: false,
        items: [
          {
            label: tSidebar("campaigns"),
            icon: Library,
            href: "/dashboard/campaigns",
            permission: "campaign.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/campaigns"),
          },
          {
            label: tSidebar("history"),
            icon: History,
            href: "/dashboard/pieces",
            permission: "piece.read",
            match: (pathname: string) => pathname.startsWith("/dashboard/pieces"),
          },
          {
            label: tSidebar("credits"),
            icon: Coins,
            href: "/dashboard/credits",
            permission: "credit.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/credits"),
          },
        ],
      },
      {
        label: t("settings"),
        collapsible: false,
        items: [
          {
            label: tSidebar("team"),
            href: "/dashboard/workspace/team",
            icon: Users,
            permission: "member.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/workspace/team"),
          },
          {
            label: tSidebar("permissions"),
            href: "/dashboard/workspace/permissions",
            icon: KeyRound,
            permission: "role.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/workspace/permissions"),
          },
          {
            label: tSidebar("settings"),
            href: "/dashboard/workspace/settings",
            icon: Settings,
            permission: "company.read",
            match: (pathname: string) =>
              pathname.startsWith("/dashboard/workspace/settings"),
          },
        ],
      },
    ],
    [brandBrainStatusTone, t, tSidebar],
  );
}
