"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { ModelDialog } from "../components/model-dialog";
import { type AIModel, useAIModels } from "../hooks/use-ai-catalog";

const columns: ColumnDef<AIModel>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name" } },
  { accessorKey: "slug", header: "Slug", meta: { label: "Slug" } },
  {
    accessorKey: "externalModelId",
    header: "External ID",
    meta: { label: "External ID" },
  },
  { accessorKey: "status", header: "Status", meta: { label: "Status" } },
];

export function ModelsPage() {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const models = useAIModels();

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Models"
        description="Modelos efetivos usados pelo runtime para texto, imagem e embeddings."
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
          data={models.data ?? []}
          emptyState={{
            title: "Nenhum modelo cadastrado",
            description:
              "Adicione modelos ativos para destravar fluxos operacionais.",
          }}
        />
      </PageLayout>
      <ModelDialog open={open} onOpenChange={setOpen} model={selectedModel} />
    </>
  );
}
