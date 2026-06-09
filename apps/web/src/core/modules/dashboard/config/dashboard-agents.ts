import {
  AGENT_UI_CONFIG,
  AGENT_UI_IDS,
  type AgentUiId,
} from "src/core/modules/agents/config/agent-ui-config";
import type { LucideIcon } from "lucide-react";

export type DashboardAgentId = AgentUiId;

export type DashboardAgentNavItem = {
  id: DashboardAgentId;
  icon: LucideIcon;
  labelKey:
    | "agentStrategist"
    | "agentCopywriter"
    | "agentDesigner"
    | "agentPost";
  href: `/dashboard/agents/${DashboardAgentId}`;
};

const AGENT_LABEL_KEYS: Record<DashboardAgentId, DashboardAgentNavItem["labelKey"]> = {
  strategist: "agentStrategist",
  copywriter: "agentCopywriter",
  designer: "agentDesigner",
  post: "agentPost",
};

export const DASHBOARD_AGENT_NAV_ITEMS: DashboardAgentNavItem[] = AGENT_UI_IDS.map(
  (id) => ({
    id,
    icon: AGENT_UI_CONFIG[id].icon,
    labelKey: AGENT_LABEL_KEYS[id],
    href: `/dashboard/agents/${id}`,
  }),
);

export function getDashboardAgentBreadcrumbKey(
  pathname: string,
): DashboardAgentNavItem["labelKey"] | null {
  const match = DASHBOARD_AGENT_NAV_ITEMS.find((agent) =>
    pathname.startsWith(agent.href),
  );
  return match?.labelKey ?? null;
}
