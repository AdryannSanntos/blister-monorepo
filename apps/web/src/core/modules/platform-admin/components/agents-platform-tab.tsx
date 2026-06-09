"use client";

import type { PlatformAgentAdminItem } from "@company-os/types";
import { Bot, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Switch } from "src/core/shared/components/ui/switch";

import { AgentConfigDialog } from "./agent-config-dialog";
import { formatPlatformMoney } from "./platform-admin-primitives";
import {
  usePlatformAgentsOverview,
  useUpdatePipeline,
} from "../hooks/use-ai-catalog";

export function AgentsPlatformTab() {
  const t = useTranslations("platformAdmin.agentsTab");
  const tc = useTranslations("common");
  const { data: agents = [], isLoading } = usePlatformAgentsOverview();
  const { mutateAsync: updatePipeline, isPending: isUpdatingPipeline } =
    useUpdatePipeline();
  const [selectedAgent, setSelectedAgent] =
    useState<PlatformAgentAdminItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggleEnabled = useCallback(
    async (agent: PlatformAgentAdminItem, enabled: boolean) => {
      try {
        await updatePipeline({
          agents: agents.map((item) => ({
            agentId: item.agentId,
            sortOrder: item.sortOrder,
            isEnabled:
              item.agentId === agent.agentId ? enabled : item.isEnabled,
          })),
        });
        toast.success(t("toggleSuccess"));
      } catch {
        toast.error(t("toggleError"));
      }
    },
    [agents, t, updatePipeline],
  );

  const handleOpenConfig = (agent: PlatformAgentAdminItem) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const columns: ColumnDef<PlatformAgentAdminItem>[] = useMemo(
    () => [
      {
        accessorKey: "label",
        header: t("nameColumn"),
        meta: { label: t("nameColumn") },
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.original.label}</span>
            <code className="text-xs text-[var(--fg-tertiary)]">
              {row.original.agentId}
            </code>
          </div>
        ),
      },
      {
        accessorKey: "policy.modelName",
        header: t("modelColumn"),
        meta: { label: t("modelColumn") },
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">
              {row.original.policy?.modelName ?? t("noModel")}
            </span>
            {row.original.policy?.modelExternalId ? (
              <span className="text-xs text-[var(--fg-tertiary)]">
                {row.original.policy.modelExternalId}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "estimatedCreditCost",
        header: t("estimatedCostColumn"),
        meta: { label: t("estimatedCostColumn") },
        cell: ({ row }) =>
          row.original.estimatedCreditCost != null
            ? formatPlatformMoney(row.original.estimatedCreditCost)
            : "-",
      },
      {
        accessorKey: "sortOrder",
        header: t("sortOrderColumn"),
        meta: { label: t("sortOrderColumn") },
      },
      {
        accessorKey: "capabilities",
        header: t("capabilitiesColumn"),
        meta: { label: t("capabilitiesColumn") },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.capabilities.slice(0, 2).map((capability) => (
              <Badge key={capability} variant="outline">
                {capability}
              </Badge>
            ))}
            {row.original.capabilities.length > 2 ? (
              <Badge variant="secondary">
                +{row.original.capabilities.length - 2}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "isEnabled",
        header: t("statusColumn"),
        meta: { label: t("statusColumn") },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Switch
              checked={row.original.isEnabled}
              disabled={isUpdatingPipeline}
              onCheckedChange={(checked) =>
                void handleToggleEnabled(row.original, checked)
              }
              aria-label={t("toggleAria", { label: row.original.label })}
            />
            <Badge variant={row.original.isEnabled ? "default" : "outline"}>
              {row.original.isEnabled ? tc("active") : tc("inactive")}
            </Badge>
          </div>
        ),
      },
      {
        id: "actions",
        header: t("actionsColumn"),
        meta: { label: t("actionsColumn") },
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleOpenConfig(row.original)}
          >
            <Settings2 className="size-4" />
            {t("configureButton")}
          </Button>
        ),
      },
    ],
    [handleToggleEnabled, isUpdatingPipeline, t, tc],
  );

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        columns={columns}
        data={agents}
        emptyState={{
          icon: Bot,
          title: t("emptyTitle"),
          description: t("emptyDescription"),
        }}
      />

      <AgentConfigDialog
        agent={selectedAgent}
        allAgents={agents}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
