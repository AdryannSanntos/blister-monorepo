"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { ProviderDialog } from "../components/provider-dialog";
import { type AIProvider, useAIProviders } from "../hooks/use-ai-catalog";

const columns: ColumnDef<AIProvider>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name" } },
  { accessorKey: "slug", header: "Slug", meta: { label: "Slug" } },
  { accessorKey: "status", header: "Status", meta: { label: "Status" } },
  {
    accessorKey: "updatedAt",
    header: "Updated at",
    meta: { label: "Updated at" },
  },
];

export function ProvidersPage() {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null,
  );
  const providers = useAIProviders();

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Providers"
        description="Catálogo base de vendors e gateways suportados pela camada de runtime."
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
          data={providers.data ?? []}
          emptyState={{
            title: "Nenhum provider cadastrado",
            description:
              "Cadastre o primeiro provider para iniciar o runtime global.",
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
