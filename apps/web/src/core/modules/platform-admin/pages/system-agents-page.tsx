"use client";

import { CircleSlash, Settings2, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  formatPlatformDate,
  PlatformAdminStatCard,
  PlatformAdminStatusBadge,
} from "../components/platform-admin-primitives";
import { SystemAgentConfigDialog } from "../components/system-agent-config-dialog";
import { SystemAgentDetailSheet } from "../components/system-agent-detail-sheet";
import { useAIModels, useAIProviders } from "../hooks/use-ai-catalog";
import {
  type SystemAgentAdminView,
  useSystemAgents,
} from "../hooks/use-system-agents";

const filters: DataTableFilter<SystemAgentAdminView>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      {
        label: "Habilitado",
        value: "enabled",
        predicate: (row) => row.config.enabled,
      },
      {
        label: "Desabilitado",
        value: "disabled",
        predicate: (row) => !row.config.enabled,
      },
    ],
  },
];

export function SystemAgentsPage() {
  const agents = useSystemAgents();
  const providers = useAIProviders();
  const models = useAIModels();

  const [editing, setEditing] = useState<SystemAgentAdminView | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detail, setDetail] = useState<SystemAgentAdminView | null>(null);

  const rows = agents.data ?? [];
  const enabled = rows.filter((row) => row.config.enabled).length;
  const configured = rows.filter(
    (row) => row.config.providerId || row.config.modelId,
  ).length;

  const providerName = (id: string | null) =>
    id
      ? ((providers.data ?? []).find((p) => p.id === id)?.name ?? id)
      : "Padrão (auto)";
  const modelName = (id: string | null) =>
    id ? ((models.data ?? []).find((m) => m.id === id)?.name ?? id) : "auto";

  const columns: ColumnDef<SystemAgentAdminView>[] = [
    {
      accessorKey: "name",
      header: "Agente",
      meta: { label: "Agente" },
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.name}
          </p>
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            {row.original.key}
          </p>
        </div>
      ),
    },
    {
      id: "model",
      header: "IA configurada",
      meta: { label: "IA configurada" },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-[12px] text-[var(--fg-secondary)]">
          <p>{providerName(row.original.config.providerId)}</p>
          <p className="text-[var(--fg-tertiary)]">
            {modelName(row.original.config.modelId)}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <PlatformAdminStatusBadge
          status={row.original.config.enabled ? "active" : "disabled"}
        />
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      meta: { label: "Atualizado em" },
      cell: ({ row }) => formatPlatformDate(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => setDetail(row.original)}>
            Detalhes
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(row.original);
              setEditOpen(true);
            }}
          >
            Configurar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageLayout
        eyebrow="Plataforma"
        title="Agentes de sistema"
        description="Agentes internos que o sistema executa nos fluxos (não pertencem a nenhuma empresa). Configure o provider/modelo de IA e teste cada um."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label="Agentes"
            value={String(rows.length)}
            hint="Agentes de sistema registrados em código."
            icon={Wand2}
          />
          <PlatformAdminStatCard
            label="Habilitados"
            value={String(enabled)}
            hint="Agentes ativos e executáveis pelo sistema."
            icon={Settings2}
          />
          <PlatformAdminStatCard
            label="IA customizada"
            value={String(configured)}
            hint="Agentes com provider/modelo definidos manualmente."
            icon={CircleSlash}
          />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          filters={filters}
          emptyState={{
            icon: Wand2,
            title: "Nenhum agente de sistema",
            description:
              "Os agentes de sistema são registrados em código e aparecem aqui automaticamente.",
          }}
        />
      </PageLayout>

      <SystemAgentConfigDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        agent={editing}
      />

      <SystemAgentDetailSheet
        agent={detail}
        providers={providers.data ?? []}
        models={models.data ?? []}
        onClose={() => setDetail(null)}
      />
    </>
  );
}
