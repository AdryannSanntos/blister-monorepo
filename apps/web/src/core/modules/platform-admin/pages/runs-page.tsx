"use client";

import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { PlatformRunDetailSheet } from "../components/platform-run-detail-sheet";
import { type PlatformRun, usePlatformRuns } from "../hooks/use-platform-runs";

const columns: ColumnDef<PlatformRun>[] = [
  {
    accessorKey: "organizationId",
    header: "Organization",
    meta: { label: "Organization" },
  },
  {
    accessorKey: "agent.name",
    header: "Agent",
    meta: { label: "Agent" },
    cell: ({ row }) => row.original.agent.name,
  },
  { accessorKey: "status", header: "Status", meta: { label: "Status" } },
  {
    accessorKey: "totalTechnicalCost",
    header: "Cost",
    meta: { label: "Cost" },
    cell: ({ row }) => row.original.totalTechnicalCost?.toFixed(4) ?? "0.0000",
  },
  {
    accessorKey: "createdAt",
    header: "Created at",
    meta: { label: "Created at" },
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

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Runs"
        description="Observabilidade global das execuções enfileiradas e concluídas na plataforma."
      >
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
          data={runs.data ?? []}
          filters={filters}
          emptyState={{
            title: "Nenhum run encontrado",
            description:
              "Os runs globais aparecerão aqui conforme os agentes forem executados.",
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
