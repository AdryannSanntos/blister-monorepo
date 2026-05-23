"use client";

import { Plus, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { ProviderDialog } from "../components/provider-dialog";
import {
  PlatformAdminStatCard,
  PlatformAdminStatusBadge,
  formatPlatformDate,
} from "../components/platform-admin-primitives";
import {
  type AIProvider,
  useAIModels,
  useAIProviders,
} from "../hooks/use-ai-catalog";

const filters: DataTableFilter<AIProvider>[] = [
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
        label: "Disabled",
        value: "disabled",
        predicate: (row) => row.status === "disabled",
      },
    ],
  },
];

export function ProvidersPage() {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null,
  );
  const providers = useAIProviders();
  const models = useAIModels();
  const rows = providers.data ?? [];
  const modelCountByProvider = (models.data ?? []).reduce<
    Record<string, number>
  >((acc, model) => {
    acc[model.providerId] = (acc[model.providerId] ?? 0) + 1;
    return acc;
  }, {});
  const active = rows.filter((item) => item.status === "active").length;
  const draft = rows.filter((item) => item.status === "draft").length;
  const disabled = rows.filter((item) => item.status === "disabled").length;
  const columns: ColumnDef<AIProvider>[] = [
    {
      accessorKey: "name",
      header: "Provider",
      meta: { label: "Provider" },
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.name}
          </p>
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            {row.original.description || row.original.slug}
          </p>
        </div>
      ),
    },
    { accessorKey: "slug", header: "Slug", meta: { label: "Slug" } },
    {
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <PlatformAdminStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "models",
      header: "Modelos",
      meta: { label: "Modelos" },
      cell: ({ row }) => modelCountByProvider[row.original.id] ?? 0,
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
        title="Providers globais"
        description="Gerencie gateways e vendors expostos para o runtime. O provider define a borda operacional de modelos, adaptadores e custos."
        actions={
          <Button
            onClick={() => {
              setSelectedProvider(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo provider
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label="Catalogo"
            value={String(rows.length)}
            hint="Quantidade total de providers registrados no runtime global."
            icon={Sparkles}
          />
          <PlatformAdminStatCard
            label="Ativos"
            value={String(active)}
            hint="Providers liberados para uso operacional agora."
            icon={ToggleRight}
          />
          <PlatformAdminStatCard
            label="Risco de backlog"
            value={String(draft + disabled)}
            hint="Itens ainda em preparacao ou retirados do catalogo ativo."
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
                    setSelectedProvider(row.original);
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
            fileName: "platform-providers",
            title: "Providers globais",
            columns: [
              { id: "name", label: "Provider", value: (row) => row.name },
              { id: "slug", label: "Slug", value: (row) => row.slug },
              { id: "status", label: "Status", value: (row) => row.status },
              {
                id: "models",
                label: "Modelos",
                value: (row) => modelCountByProvider[row.id] ?? 0,
              },
              {
                id: "updatedAt",
                label: "Atualizado em",
                value: (row) => formatPlatformDate(row.updatedAt),
              },
            ],
          }}
          emptyState={{
            icon: Sparkles,
            title: "Nenhum provider cadastrado",
            description:
              "Cadastre o primeiro provider para iniciar o runtime global com catalogo controlado.",
            action: (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Criar provider
              </Button>
            ),
          }}
        />
      </PageLayout>
      <ProviderDialog
        open={open}
        onOpenChange={setOpen}
        provider={selectedProvider}
      />
    </>
  );
}
