"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { PolicyDialog } from "../components/policy-dialog";
import {
  type AIProviderPolicy,
  useAIProviderPolicies,
} from "../hooks/use-ai-catalog";

const columns: ColumnDef<AIProviderPolicy>[] = [
  {
    accessorKey: "organizationId",
    header: "Organization",
    meta: { label: "Organization" },
  },
  {
    accessorKey: "providerId",
    header: "Provider",
    meta: { label: "Provider" },
  },
  {
    accessorKey: "allowedModelIds",
    header: "Allowed models",
    meta: { label: "Allowed models" },
    cell: ({ row }) => row.original.allowedModelIds.join(", ") || "All",
  },
  {
    accessorKey: "updatedAt",
    header: "Updated at",
    meta: { label: "Updated at" },
  },
];

export function PoliciesPage() {
  const [open, setOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<AIProviderPolicy | null>(
    null,
  );
  const policies = useAIProviderPolicies();

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Policies"
        description="Regras por empresa para disponibilidade, allowed models e uso de BYOK."
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
          data={policies.data ?? []}
          emptyState={{
            title: "Nenhuma política configurada",
            description:
              "As empresas sem policy explícita usam os padrões globais ativos.",
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
