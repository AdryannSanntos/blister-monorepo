"use client";

import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type TemplateRow = {
  id: string;
  name: string;
  category: string;
  status: string;
};

const columns: ColumnDef<TemplateRow>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name" } },
  { accessorKey: "category", header: "Category", meta: { label: "Category" } },
  { accessorKey: "status", header: "Status", meta: { label: "Status" } },
];

export function TemplatesPage() {
  return (
    <PageLayout
      eyebrow="Conta"
      title="Templates"
      description="Templates globais de agente ficarão disponíveis aqui conforme o catálogo evoluir."
    >
      <DataTable
        columns={columns}
        data={[]}
        emptyState={{
          title: "Nenhum template disponível",
          description:
            "Os templates globais entram na próxima etapa do foundation.",
        }}
      />
    </PageLayout>
  );
}
