"use client";

import { BadgeCheck, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { PolicyDialog } from "../components/policy-dialog";
import {
  PlatformAdminStatCard,
  formatPlatformDate,
} from "../components/platform-admin-primitives";
import {
  type AIProviderPolicy,
  useAIProviders,
  useAIProviderPolicies,
} from "../hooks/use-ai-catalog";

export function PoliciesPage() {
  const [open, setOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<AIProviderPolicy | null>(
    null,
  );
  const policies = useAIProviderPolicies();
  const providers = useAIProviders();
  const rows = policies.data ?? [];
  const providerNameById = Object.fromEntries(
    (providers.data ?? []).map((provider) => [provider.id, provider.name]),
  );
  const restrictedPolicies = rows.filter(
    (row) => row.allowedModelIds.length > 0,
  ).length;
  const freePolicies = rows.length - restrictedPolicies;
  const filters: DataTableFilter<AIProviderPolicy>[] = [
    {
      id: "scope",
      label: "Escopo",
      options: [
        {
          label: "Com modelos restritos",
          value: "restricted",
          predicate: (row) => row.allowedModelIds.length > 0,
        },
        {
          label: "Sem restricao explicita",
          value: "open",
          predicate: (row) => row.allowedModelIds.length === 0,
        },
      ],
    },
  ];
  const columns: ColumnDef<AIProviderPolicy>[] = [
    {
      accessorKey: "organizationId",
      header: "Organization",
      meta: { label: "Organization" },
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            {row.original.organizationId}
          </p>
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            Policy {row.original.id}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "providerId",
      header: "Provider",
      meta: { label: "Provider" },
      cell: ({ row }) =>
        providerNameById[row.original.providerId] ?? row.original.providerId,
    },
    {
      accessorKey: "allowedModelIds",
      header: "Modelos permitidos",
      meta: { label: "Modelos permitidos" },
      cell: ({ row }) =>
        row.original.allowedModelIds.length > 0
          ? row.original.allowedModelIds.join(", ")
          : "Fallback global",
    },
    {
      id: "notes",
      header: "Notas",
      meta: { label: "Notas" },
      cell: ({ row }) =>
        typeof row.original.metadata.notes === "string" &&
        row.original.metadata.notes.length > 0
          ? row.original.metadata.notes
          : "-",
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
        title="Policies por empresa"
        description="Defina restricoes por organization para controlar exposicao de providers, modelos e defaults operacionais fora do runtime padrao."
        actions={
          <Button
            onClick={() => {
              setSelectedPolicy(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova política
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label="Policies"
            value={String(rows.length)}
            hint="Quantidade de empresas com regra explicita na camada global."
            icon={BadgeCheck}
          />
          <PlatformAdminStatCard
            label="Com restricao"
            value={String(restrictedPolicies)}
            hint="Policies com lista declarada de modelos permitidos."
            icon={ShieldCheck}
          />
          <PlatformAdminStatCard
            label="Fallback global"
            value={String(freePolicies)}
            hint="Policies que apenas registram metadata e herdam o catalogo global."
            icon={Sparkles}
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
                    setSelectedPolicy(row.original);
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
            fileName: "platform-policies",
            title: "Policies por empresa",
            columns: [
              {
                id: "organizationId",
                label: "Organization",
                value: (row) => row.organizationId,
              },
              {
                id: "providerId",
                label: "Provider",
                value: (row) =>
                  providerNameById[row.providerId] ?? row.providerId,
              },
              {
                id: "allowedModelIds",
                label: "Modelos permitidos",
                value: (row) =>
                  row.allowedModelIds.join(", ") || "Fallback global",
              },
              {
                id: "notes",
                label: "Notas",
                value: (row) =>
                  typeof row.metadata.notes === "string" &&
                  row.metadata.notes.length > 0
                    ? row.metadata.notes
                    : "-",
              },
              {
                id: "updatedAt",
                label: "Atualizado em",
                value: (row) => formatPlatformDate(row.updatedAt),
              },
            ],
          }}
          emptyState={{
            icon: BadgeCheck,
            title: "Nenhuma politica configurada",
            description:
              "As empresas sem policy explicita continuam usando o catalogo global ativo.",
            action: (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Criar policy
              </Button>
            ),
          }}
        />
      </PageLayout>
      <PolicyDialog
        open={open}
        onOpenChange={setOpen}
        policy={selectedPolicy}
      />
    </>
  );
}
