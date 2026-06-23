"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import {
  extractCutsFromRunDto,
  getRunSourceTitle,
} from "src/core/modules/agents/utils/cuts-run-display";
import { getAgentById } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import type { TableRowActionItem } from "src/core/shared/components/ui/table-row-actions-menu";

import { useRouter } from "@/i18n/routing";

export const canViewRunCuts = (run: AgentRunStatusDto) =>
  extractCutsFromRunDto(run).length > 0 ||
  run.status === "COMPLETED" ||
  run.status === "PAUSED";

export const useCutsRunMenuItems = (
  run: AgentRunStatusDto,
): {
  items: TableRowActionItem[];
  ariaLabel: string;
  canView: boolean;
} => {
  const t = useTranslations("agents.overview.runsGrid");
  const router = useRouter();

  const sourceTitle = getRunSourceTitle(run.inputPayload);
  const routeSlug =
    getAgentById(run.agentId)?.routeSlug ?? run.agentId;

  const handleViewCuts = useCallback(() => {
    router.push(getAgentRunPath(routeSlug, run.id));
  }, [router, routeSlug, run.id]);

  const items = useMemo<TableRowActionItem[]>(
    () => [
      {
        id: "view",
        label: t("viewCuts"),
        icon: Eye,
        onClick: handleViewCuts,
      },
    ],
    [handleViewCuts, t],
  );

  return {
    items,
    ariaLabel: t("actionsMenu", { name: sourceTitle }),
    canView: canViewRunCuts(run),
  };
};
