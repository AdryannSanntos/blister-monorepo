"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, History } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { RunDetailSheet } from "src/core/modules/agents/components/executions/run-detail-sheet";
import {
  type AgentRun,
  useAgentRuns,
} from "src/core/modules/agents/hooks/use-agent-runs";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";

function statusLabel(status: AgentRun["status"]) {
  if (status === "completed") return "Concluído";
  if (status === "error") return "Erro";
  if (status === "running") return "Executando";
  if (status === "queued") return "Aguardando";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusVariant(
  status: AgentRun["status"],
): "success" | "secondary" | "destructive" | "warning" {
  if (status === "completed") return "success";
  if (status === "error") return "destructive";
  if (status === "running" || status === "queued") return "warning";
  return "secondary";
}

export function AgentExecutionsPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const { cannot, isLoading: abilityLoading } = useAbility();
  const runsFilters = useMemo(() => ({ agentId }), [agentId]);
  const runs = useAgentRuns(orgId, runsFilters);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  if (!abilityLoading && cannot("read", "AgentRun")) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--fg-tertiary)]">
        Você não tem permissão para ver execuções.
      </div>
    );
  }

  const columns: ColumnDef<AgentRun>[] = [
    {
      id: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (r) => r.createdAt,
      header: "Iniciada em",
      meta: { label: "Iniciada em" },
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)] tabular-nums">
          {format(new Date(row.original.createdAt), "dd/MM HH:mm:ss", {
            locale: ptBR,
          })}
        </span>
      ),
    },
    {
      id: "creditDelta",
      accessorFn: (r) => r.creditDelta,
      header: "Créditos",
      meta: { label: "Créditos" },
      cell: ({ row }) => (
        <span className="text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {row.original.creditDelta}
        </span>
      ),
    },
    {
      id: "stepsCount",
      header: "Etapas",
      enableSorting: false,
      meta: { label: "Etapas" },
      cell: ({ row }) => (
        <span className="text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {row.original.steps?.length ?? 0}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ver detalhes"
            onClick={() => setSelectedRunId(row.original.id)}
          >
            <Eye className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter<AgentRun>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        {
          label: "Aguardando",
          value: "queued",
          predicate: (r) => r.status === "queued",
        },
        {
          label: "Executando",
          value: "running",
          predicate: (r) => r.status === "running",
        },
        {
          label: "Concluído",
          value: "completed",
          predicate: (r) => r.status === "completed",
        },
        {
          label: "Erro",
          value: "error",
          predicate: (r) => r.status === "error",
        },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-[var(--line-subtle)] bg-[var(--bg-base)] px-6 py-3">
        <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">
          Execuções
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
          Histórico de execuções deste agente.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <DataTable
          columns={columns}
          data={runs.data ?? []}
          filters={filters}
          emptyState={{
            icon: History,
            title: "Sem execuções ainda",
            description:
              "Quando este agente executar uma tarefa, ela vai aparecer aqui.",
          }}
        />
      </div>

      <RunDetailSheet
        open={Boolean(selectedRunId)}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
        orgId={orgId}
        runId={selectedRunId}
      />
    </div>
  );
}
