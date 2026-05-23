"use client";

import { Activity, CircleDollarSign, TimerReset, Workflow } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { PlatformRunDetailSheet } from "../components/platform-run-detail-sheet";
import {
  PlatformAdminStatCard,
  PlatformAdminStatusBadge,
  formatPlatformDate,
  formatPlatformMoney,
} from "../components/platform-admin-primitives";
import { type PlatformRun, usePlatformRuns } from "../hooks/use-platform-runs";

const columns: ColumnDef<PlatformRun>[] = [
  {
    accessorKey: "organizationId",
    header: "Organization",
    meta: { label: "Organization" },
  },
  {
    accessorKey: "agent.name",
    header: "Agente",
    meta: { label: "Agente" },
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
          {row.original.agent.name}
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)]">
          Run {row.original.id}
        </p>
      </div>
    ),
  },
  {
    id: "steps",
    header: "Steps",
    meta: { label: "Steps" },
    cell: ({ row }) => row.original.steps.length,
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <PlatformAdminStatusBadge status={row.original.status} />
    ),
  },
  {
    accessorKey: "totalTechnicalCost",
    header: "Custo",
    meta: { label: "Custo" },
    cell: ({ row }) => formatPlatformMoney(row.original.totalTechnicalCost),
  },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    meta: { label: "Criado em" },
    cell: ({ row }) => formatPlatformDate(row.original.createdAt),
  },
];

const filters: DataTableFilter<PlatformRun>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      {
        label: "Queued",
        value: "queued",
        predicate: (row) => row.status === "queued",
      },
      {
        label: "Running",
        value: "running",
        predicate: (row) => row.status === "running",
      },
      {
        label: "Success",
        value: "success",
        predicate: (row) => row.status === "success",
      },
      {
        label: "Error",
        value: "error",
        predicate: (row) => row.status === "error",
      },
    ],
  },
];

export function RunsPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const runs = usePlatformRuns();
  const rows = runs.data ?? [];
  const running = rows.filter(
    (row) => row.status === "queued" || row.status === "running",
  ).length;
  const successful = rows.filter((row) => row.status === "success").length;
  const failed = rows.filter(
    (row) => row.status === "error" || row.status === "failed",
  ).length;
  const totalCost = rows.reduce(
    (sum, row) => sum + (row.totalTechnicalCost ?? 0),
    0,
  );

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Execucoes globais"
        description="Acompanhe backlog, sucesso, falha e custo das execucoes disparadas na camada central de agentes da plataforma."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PlatformAdminStatCard
            label="Runs"
            value={String(rows.length)}
            hint="Quantidade total de execucoes registradas nesta visao global."
            icon={Workflow}
          />
          <PlatformAdminStatCard
            label="Em fila ou rodando"
            value={String(running)}
            hint="Itens que ainda podem consumir credito, custo ou gerar bloqueio operacional."
            icon={TimerReset}
          />
          <PlatformAdminStatCard
            label="Sucesso vs erro"
            value={`${successful}/${failed}`}
            hint="Relacao simples entre runs finalizados com sucesso e com falha."
            icon={Activity}
          />
          <PlatformAdminStatCard
            label="Custo acumulado"
            value={formatPlatformMoney(totalCost)}
            hint="Soma dos custos tecnicos reportados por run nesta listagem."
            icon={CircleDollarSign}
          />
        </div>

        <DataTable
          columns={[
            ...columns,
            {
              id: "actions",
              header: "",
              enableSorting: false,
              enableHiding: false,
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRunId(row.original.id)}
                >
                  Ver detalhe
                </Button>
              ),
            },
          ]}
          data={rows}
          filters={filters}
          exportOptions={{
            fileName: "platform-runs",
            title: "Execucoes globais",
            columns: [
              {
                id: "organizationId",
                label: "Organization",
                value: (row) => row.organizationId,
              },
              { id: "agent", label: "Agente", value: (row) => row.agent.name },
              { id: "status", label: "Status", value: (row) => row.status },
              {
                id: "steps",
                label: "Steps",
                value: (row) => row.steps.length,
              },
              {
                id: "cost",
                label: "Custo",
                value: (row) => formatPlatformMoney(row.totalTechnicalCost),
              },
              {
                id: "createdAt",
                label: "Criado em",
                value: (row) => formatPlatformDate(row.createdAt),
              },
            ],
          }}
          emptyState={{
            icon: Workflow,
            title: "Nenhum run encontrado",
            description:
              "Os runs globais aparecerao aqui conforme os agentes forem executados pela plataforma.",
          }}
        />
      </PageLayout>
      <PlatformRunDetailSheet
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  );
}
