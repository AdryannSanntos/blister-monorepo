"use client";

import { Bot, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { ModelDialog } from "../components/model-dialog";
import {
  PlatformAdminStatCard,
  PlatformAdminStatusBadge,
  formatPlatformDate,
} from "../components/platform-admin-primitives";
import {
  type AIModel,
  useAIModels,
  useAIProviders,
} from "../hooks/use-ai-catalog";

const filters: DataTableFilter<AIModel>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      {
        label: "Ativo",
        value: "active",
        predicate: (row) => row.status === "active",
      },
      {
        label: "Draft",
        value: "draft",
        predicate: (row) => row.status === "draft",
      },
      {
        label: "Deprecated",
        value: "deprecated",
        predicate: (row) => row.status === "deprecated",
      },
      {
        label: "Disabled",
        value: "disabled",
        predicate: (row) => row.status === "disabled",
      },
    ],
  },
];

export function ModelsPage() {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const models = useAIModels();
  const providers = useAIProviders();
  const rows = models.data ?? [];
  const providerNameById = Object.fromEntries(
    (providers.data ?? []).map((provider) => [provider.id, provider.name]),
  );
  const active = rows.filter((item) => item.status === "active").length;
  const deprecated = rows.filter((item) => item.status === "deprecated").length;
  const disabled = rows.filter((item) => item.status === "disabled").length;
  const columns: ColumnDef<AIModel>[] = [
    {
      accessorKey: "name",
      header: "Modelo",
      meta: { label: "Modelo" },
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.name}
          </p>
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            {row.original.slug}
          </p>
        </div>
      ),
    },
    {
      id: "provider",
      header: "Provider",
      meta: { label: "Provider" },
      cell: ({ row }) =>
        providerNameById[row.original.providerId] ?? row.original.providerId,
    },
    {
      accessorKey: "externalModelId",
      header: "External ID",
      meta: { label: "External ID" },
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
      accessorKey: "updatedAt",
      header: "Atualizado em",
      meta: { label: "Atualizado em" },
      cell: ({ row }) => formatPlatformDate(row.original.updatedAt),
    },
  ];

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Modelos globais"
        description="Mantenha o catalogo de modelos coerente com providers ativos, limites operacionais e estrategia de custo da plataforma."
        actions={
          <Button
            onClick={() => {
              setSelectedModel(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo modelo
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label="Catalogo"
            value={String(rows.length)}
            hint="Total de modelos registrados e prontos para governanca global."
            icon={Bot}
          />
          <PlatformAdminStatCard
            label="Ativos"
            value={String(active)}
            hint="Modelos liberados para uso efetivo pelos agentes."
            icon={ToggleRight}
          />
          <PlatformAdminStatCard
            label="Fora da rota"
            value={String(deprecated + disabled)}
            hint="Itens que exigem revisao, migracao ou retirada do runtime."
            icon={ToggleLeft}
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
                  onClick={() => {
                    setSelectedModel(row.original);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
              ),
            },
          ]}
          data={rows}
          filters={filters}
          exportOptions={{
            fileName: "platform-models",
            title: "Modelos globais",
            columns: [
              { id: "name", label: "Modelo", value: (row) => row.name },
              {
                id: "provider",
                label: "Provider",
                value: (row) =>
                  providerNameById[row.providerId] ?? row.providerId,
              },
              {
                id: "externalModelId",
                label: "External ID",
                value: (row) => row.externalModelId,
              },
              { id: "status", label: "Status", value: (row) => row.status },
              {
                id: "updatedAt",
                label: "Atualizado em",
                value: (row) => formatPlatformDate(row.updatedAt),
              },
            ],
          }}
          emptyState={{
            icon: Bot,
            title: "Nenhum modelo cadastrado",
            description:
              "Adicione modelos para destravar fluxos operacionais e controle global de custo.",
            action: (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Criar modelo
              </Button>
            ),
          }}
        />
      </PageLayout>
      <ModelDialog open={open} onOpenChange={setOpen} model={selectedModel} />
    </>
  );
}
