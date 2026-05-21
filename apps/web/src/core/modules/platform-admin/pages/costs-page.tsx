"use client";

import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  usePlatformCostBreakdown,
  usePlatformCosts,
} from "../hooks/use-platform-runs";

type CostRow = { key: string; amount: number };

const columns: ColumnDef<CostRow>[] = [
  { accessorKey: "key", header: "Key", meta: { label: "Key" } },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { label: "Amount" },
    cell: ({ row }) => row.original.amount.toFixed(4),
  },
];

export function CostsPage() {
  const summary = usePlatformCosts();
  const providers = usePlatformCostBreakdown("providers");

  return (
    <PageLayout
      eyebrow="Conta"
      title="Costs"
      description={`Custo técnico total estimado: ${summary.data?.totalCost?.toFixed(4) ?? "0.0000"} USD`}
    >
      <DataTable
        columns={columns}
        data={providers.data?.breakdown ?? []}
        emptyState={{
          title: "Nenhum custo registrado",
          description:
            "Os custos técnicos serão agrupados por provider conforme os runs consumirem runtime.",
        }}
      />
    </PageLayout>
  );
}
