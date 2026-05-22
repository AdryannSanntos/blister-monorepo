"use client";

import { Coins, Receipt, Wallet } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  type CreditLedgerEntry,
  useAgentRuns,
  useOrganizationCreditLedger,
  useOrganizationCredits,
} from "../hooks/use-agent-runs";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readReason(entry: CreditLedgerEntry) {
  const reason =
    entry.metadata && typeof entry.metadata.reason === "string"
      ? entry.metadata.reason
      : null;
  if (reason) return reason;
  if (entry.entryType === "run_debit") return "Consumo operacional do agente";
  return "Lançamento interno";
}

export function AgentCreditsPage() {
  const { activeOrgId } = useActiveOrganization();
  const [ledgerFilters, setLedgerFilters] = useQueryStates({
    type: parseAsString.withDefault("all"),
    period: parseAsString.withDefault("30d"),
    agentId: parseAsString.withDefault("all"),
  });

  const credits = useOrganizationCredits(activeOrgId);
  const ledger = useOrganizationCreditLedger(activeOrgId);
  const runs = useAgentRuns(activeOrgId);

  const runById = useMemo(
    () => new Map((runs.data ?? []).map((run) => [run.id, run])),
    [runs.data],
  );

  const periodStart = useMemo(() => {
    const now = Date.now();
    if (ledgerFilters.period === "7d")
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (ledgerFilters.period === "90d")
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }, [ledgerFilters.period]);

  const recentEntries = (ledger.data ?? []).filter(
    (entry) => new Date(entry.createdAt).getTime() >= periodStart.getTime(),
  );
  const recentDebits = recentEntries.filter((entry) => entry.amount < 0);
  const usageLast30Days = recentDebits.reduce(
    (sum, entry) => sum + Math.abs(entry.amount),
    0,
  );
  const averageCostPerRun = recentDebits.length
    ? usageLast30Days / recentDebits.length
    : 0;

  const topAgent = Array.from(
    recentDebits
      .reduce((map, entry) => {
        const run = entry.runId ? runById.get(entry.runId) : null;
        if (!run) return map;
        const current = map.get(run.agent.name) ?? 0;
        map.set(run.agent.name, current + Math.abs(entry.amount));
        return map;
      }, new Map<string, number>())
      .entries(),
  ).sort((a, b) => b[1] - a[1])[0];

  const filters: DataTableFilter<CreditLedgerEntry>[] = [
    {
      id: "type",
      label: "Tipo",
      options: [
        {
          label: "Crédito adicionado",
          value: "credit_added",
          predicate: (entry) => entry.entryType === "credit_added",
        },
        {
          label: "Débito de run",
          value: "run_debit",
          predicate: (entry) => entry.entryType === "run_debit",
        },
        {
          label: "Refund",
          value: "run_refund",
          predicate: (entry) => entry.entryType === "run_refund",
        },
      ],
    },
    {
      id: "period",
      label: "Período",
      options: [
        {
          label: "7 dias",
          value: "7d",
          predicate: (entry) =>
            new Date(entry.createdAt).getTime() >=
            Date.now() - 7 * 24 * 60 * 60 * 1000,
        },
        {
          label: "30 dias",
          value: "30d",
          predicate: (entry) =>
            new Date(entry.createdAt).getTime() >=
            Date.now() - 30 * 24 * 60 * 60 * 1000,
        },
        {
          label: "90 dias",
          value: "90d",
          predicate: (entry) =>
            new Date(entry.createdAt).getTime() >=
            Date.now() - 90 * 24 * 60 * 60 * 1000,
        },
      ],
    },
    {
      id: "agentId",
      label: "Agente",
      options: Array.from(
        new Map(
          (runs.data ?? []).map((run) => [run.agent.id, run.agent.name]),
        ).entries(),
      ).map(([value, label]) => ({
        value,
        label,
        predicate: (entry: CreditLedgerEntry) => {
          const run = entry.runId ? runById.get(entry.runId) : null;
          return run?.agent.id === value;
        },
      })),
    },
  ];

  const columns: ColumnDef<CreditLedgerEntry>[] = [
    {
      accessorKey: "createdAt",
      header: "Data",
      meta: { label: "Data" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    { accessorKey: "entryType", header: "Tipo", meta: { label: "Tipo" } },
    {
      id: "reference",
      header: "Agente / run",
      meta: { label: "Agente / run" },
      cell: ({ row }) => {
        const run = row.original.runId ? runById.get(row.original.runId) : null;
        return (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
              {run?.agent.name ?? "Lançamento manual"}
            </p>
            <p className="truncate font-mono text-[12px] tabular-nums text-[var(--fg-tertiary)]">
              {row.original.runId ?? "-"}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "createdByUserId",
      header: "Usuário",
      meta: { label: "Usuário" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {row.original.createdByUserId?.slice(0, 8) ?? "Sistema"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Créditos",
      meta: { label: "Créditos" },
      cell: ({ row }) => (
        <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
          {row.original.amount}
        </span>
      ),
    },
    {
      id: "reason",
      header: "Motivo",
      meta: { label: "Motivo" },
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--fg-secondary)]">
          {readReason(row.original)}
        </span>
      ),
    },
  ];

  if (!activeOrgId) return null;

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Créditos e consumo"
      description="Monitore o saldo da company, os débitos por run e o padrão de uso recente dos agentes operacionais."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Saldo atual",
            value: credits.data?.balance ?? 0,
            copy: "Crédito disponível para novas execuções.",
            icon: Wallet,
          },
          {
            label: "Uso no período",
            value: usageLast30Days,
            copy: "Débitos acumulados no recorte selecionado.",
            icon: Coins,
          },
          {
            label: "Média por run",
            value: averageCostPerRun.toFixed(1),
            copy: "Consumo médio de crédito por execução.",
            icon: Receipt,
          },
          {
            label: "Top agente",
            value: topAgent ? `${topAgent[0]} (${topAgent[1]})` : "Sem dados",
            copy: "Maior consumo operacional no período.",
            icon: Coins,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-0">
                <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
                  {item.label}
                </CardTitle>
                <div className="flex size-9 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-4">
                <p className="text-2xl font-medium text-[var(--fg-primary)]">
                  {item.value}
                </p>
                <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                  {item.copy}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <DataTable
        columns={columns}
        data={ledger.data ?? []}
        getRowId={(entry) => entry.id}
        filters={filters}
        filterValues={ledgerFilters as Record<string, string>}
        onFilterValuesChange={(values) =>
          void setLedgerFilters(
            values as { type: string; period: string; agentId: string },
          )
        }
        emptyState={{
          title: "Nenhum lançamento encontrado",
          description:
            "Os créditos e débitos dos runs aparecerão aqui conforme a company passar a operar os agentes.",
        }}
        exportOptions={{
          fileName: "credit-ledger",
          title: "Ledger de créditos",
          columns: [
            {
              id: "createdAt",
              label: "Data",
              value: (entry) => formatDate(entry.createdAt),
            },
            {
              id: "entryType",
              label: "Tipo",
              value: (entry) => entry.entryType,
            },
            { id: "amount", label: "Créditos", value: (entry) => entry.amount },
            {
              id: "reason",
              label: "Motivo",
              value: (entry) => readReason(entry),
            },
          ],
        }}
      />
    </PageLayout>
  );
}
