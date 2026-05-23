"use client";

import { ChartColumn, ReceiptText, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  PlatformAdminStatCard,
  formatPlatformMoney,
} from "../components/platform-admin-primitives";
import {
  usePlatformCostBreakdown,
  usePlatformCosts,
} from "../hooks/use-platform-runs";

type CostRow = { key: string; amount: number };

const columns: ColumnDef<CostRow>[] = [
  { accessorKey: "key", header: "Item", meta: { label: "Item" } },
  {
    accessorKey: "amount",
    header: "Custo",
    meta: { label: "Custo" },
    cell: ({ row }) => formatPlatformMoney(row.original.amount),
  },
];

export function CostsPage() {
  const summary = usePlatformCosts();
  const providers = usePlatformCostBreakdown("providers");
  const models = usePlatformCostBreakdown("models");
  const providerRows = providers.data?.breakdown ?? [];
  const modelRows = models.data?.breakdown ?? [];
  const topProvider = providerRows[0];
  const topModel = modelRows[0];

  return (
    <PageLayout
      eyebrow="Conta"
      title="Custos tecnicos"
      description="Leia rapidamente onde a plataforma esta consumindo runtime e compare o peso por provider e por modelo."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <PlatformAdminStatCard
          label="Total acumulado"
          value={formatPlatformMoney(summary.data?.totalCost)}
          hint="Somatorio bruto de custo tecnico medido na camada global."
          icon={ReceiptText}
        />
        <PlatformAdminStatCard
          label="Maior provider"
          value={topProvider ? `${topProvider.key}` : "-"}
          hint={
            topProvider
              ? formatPlatformMoney(topProvider.amount)
              : "Nenhum custo por provider ainda."
          }
          icon={Sparkles}
        />
        <PlatformAdminStatCard
          label="Maior modelo"
          value={topModel ? `${topModel.key}` : "-"}
          hint={
            topModel
              ? formatPlatformMoney(topModel.amount)
              : "Nenhum custo por modelo ainda."
          }
          icon={ChartColumn}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">
              Breakdown por provider
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <DataTable
              columns={columns}
              data={providerRows}
              enablePagination={false}
              exportOptions={{
                fileName: "platform-costs-providers",
                title: "Custos por provider",
                columns: [
                  { id: "key", label: "Provider", value: (row) => row.key },
                  {
                    id: "amount",
                    label: "Custo",
                    value: (row) => formatPlatformMoney(row.amount),
                  },
                ],
              }}
              emptyState={{
                icon: Sparkles,
                title: "Nenhum custo registrado",
                description:
                  "Os custos tecnicos serao agrupados por provider conforme os runs consumirem runtime.",
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-base)]">
          <CardHeader className="border-b border-[var(--line-subtle)] pb-5">
            <CardTitle className="text-[18px]">Breakdown por modelo</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <DataTable
              columns={columns}
              data={modelRows}
              enablePagination={false}
              exportOptions={{
                fileName: "platform-costs-models",
                title: "Custos por modelo",
                columns: [
                  { id: "key", label: "Modelo", value: (row) => row.key },
                  {
                    id: "amount",
                    label: "Custo",
                    value: (row) => formatPlatformMoney(row.amount),
                  },
                ],
              }}
              emptyState={{
                icon: ChartColumn,
                title: "Nenhum custo por modelo",
                description:
                  "Assim que os runs reportarem modelo consumido, a distribuicao aparecera aqui.",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
