"use client";

import { Eye } from "lucide-react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import type { AgentRun } from "../hooks/use-agent-runs";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(run: AgentRun) {
  if (run.status === "queued" || run.status === "running")
    return "Em andamento";
  const durationMs = Math.max(
    0,
    new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime(),
  );
  return `${Math.round(durationMs / 1000)}s`;
}

function runStatusVariant(status: string) {
  if (status === "success") return "success" as const;
  if (status === "error") return "destructive" as const;
  if (status === "running") return "warning" as const;
  return "secondary" as const;
}

function technicalSummary(run: AgentRun) {
  const steps = run.steps ?? [];
  const errored = steps.filter((step) => step.status === "error").length;
  const completed = steps.filter((step) => step.status === "success").length;
  if (errored > 0) return `${errored} bloco(s) com erro`;
  if (run.status === "running")
    return `${completed}/${steps.length} blocos concluídos`;
  return `${completed} bloco(s) concluidos`;
}

export function AgentRunTable({
  data,
  currentUserId,
  filterValues,
  onFilterValuesChange,
  onSelectRun,
}: {
  data: AgentRun[];
  currentUserId?: string | null;
  filterValues: Record<string, string>;
  onFilterValuesChange: (values: Record<string, string>) => void;
  onSelectRun: (runId: string) => void;
}) {
  const agentOptions = Array.from(
    new Map(data.map((run) => [run.agent.id, run.agent.name])).entries(),
  ).map(([value, label]) => ({ value, label }));

  const filters: DataTableFilter<AgentRun>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        {
          label: "Queued",
          value: "queued",
          predicate: (run) => run.status === "queued",
        },
        {
          label: "Running",
          value: "running",
          predicate: (run) => run.status === "running",
        },
        {
          label: "Success",
          value: "success",
          predicate: (run) => run.status === "success",
        },
        {
          label: "Error",
          value: "error",
          predicate: (run) => run.status === "error",
        },
      ],
    },
    {
      id: "origin",
      label: "Origem",
      options: [
        {
          label: "Template",
          value: "template",
          predicate: (run) => Boolean(run.agent.templateId),
        },
        {
          label: "Custom",
          value: "custom",
          predicate: (run) => !run.agent.templateId,
        },
      ],
    },
    {
      id: "scope",
      label: "Escopo",
      options: [
        {
          label: "Meus runs",
          value: "mine",
          predicate: (run) => run.createdByUserId === currentUserId,
        },
        {
          label: "Time",
          value: "team",
          predicate: (run) => run.createdByUserId !== currentUserId,
        },
      ],
    },
    {
      id: "agentId",
      label: "Agente",
      options: agentOptions.map((option) => ({
        ...option,
        predicate: (run: AgentRun) => run.agent.id === option.value,
      })),
    },
  ];

  const columns: ColumnDef<AgentRun>[] = [
    {
      id: "agent",
      header: "Agente",
      meta: { label: "Agente" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.agent.name}
          </p>
          <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
            {row.original.agent.id}
          </p>
        </div>
      ),
    },
    {
      id: "user",
      header: "Usuário",
      meta: { label: "Usuário" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {row.original.createdByUserId === currentUserId
            ? "Você"
            : row.original.createdByUserId.slice(0, 8)}
        </span>
      ),
    },
    {
      id: "origin",
      header: "Origem",
      meta: { label: "Origem" },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.agent.templateId ? "Template" : "Custom"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge variant={runStatusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "credits",
      header: "Créditos",
      meta: { label: "Créditos" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {Math.abs(row.original.creditDelta ?? 0)}
        </span>
      ),
    },
    {
      id: "technical",
      header: "Resumo técnico",
      meta: { label: "Resumo técnico" },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)]">
          {technicalSummary(row.original)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Iniciado em",
      meta: { label: "Iniciado em" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duração",
      meta: { label: "Duração" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {formatDuration(row.original)}
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
          <Button variant="ghost" onClick={() => onSelectRun(row.original.id)}>
            <Eye className="size-4" />
            Ver detalhe
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(run) => run.id}
      filters={filters}
      filterValues={filterValues}
      onFilterValuesChange={onFilterValuesChange}
      emptyState={{
        title: "Nenhum run encontrado",
        description:
          "Os runs de agentes aparecerão aqui conforme o workspace executar análises, copies e imagens.",
      }}
      exportOptions={{
        fileName: "agent-runs",
        title: "Histórico de runs",
        columns: [
          { id: "agent", label: "Agente", value: (run) => run.agent.name },
          { id: "status", label: "Status", value: (run) => run.status },
          {
            id: "credits",
            label: "Créditos",
            value: (run) => Math.abs(run.creditDelta ?? 0),
          },
          {
            id: "startedAt",
            label: "Iniciado em",
            value: (run) => formatDate(run.createdAt),
          },
          {
            id: "duration",
            label: "Duração",
            value: (run) => formatDuration(run),
          },
        ],
      }}
    />
  );
}
