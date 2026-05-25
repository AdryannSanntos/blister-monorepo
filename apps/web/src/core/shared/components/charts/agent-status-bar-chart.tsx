"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "src/core/shared/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { formatChartNumber, formatChartPercent } from "./chart-formatters";

type AgentStatusBarChartProps = {
  data: Array<{
    label: string;
    count: number;
    fill: string;
  }>;
  totalAgents: number;
};

type ViewMode = "count" | "share";

const chartConfig = {
  count: {
    label: "Agentes",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function AgentStatusBarChart({
  data,
  totalAgents,
}: AgentStatusBarChartProps) {
  const [mode, setMode] = useState<ViewMode>("count");
  const chartData = data.map((item) => ({
    ...item,
    value:
      mode === "share" && totalAgents > 0
        ? Number(((item.count / totalAgents) * 100).toFixed(1))
        : item.count,
  }));
  const activeShare =
    totalAgents === 0
      ? 0
      : Math.round((data[0]?.count ?? 0 / totalAgents) * 100);

  return (
    <Card>
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <div>
          <CardTitle>Status dos agentes</CardTitle>
          <CardDescription>
            Distribuicao atual entre ativos, rascunhos e arquivados.
          </CardDescription>
        </div>
        <CardAction className="w-[150px] self-center">
          <Select
            value={mode}
            onValueChange={(value) => setMode(value as ViewMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Quantidade</SelectItem>
              <SelectItem value="share">Participacao</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Total de agentes
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalAgents)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Cobertura ativa
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartPercent(activeShare)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Visualizacao
            </p>
            <p className="mt-1.5 text-[20px] font-medium text-[var(--fg-primary)]">
              {mode === "count" ? "Quantidade" : "Participacao"}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[image:linear-gradient(var(--bg-sunken),var(--bg-sunken)),linear-gradient(90deg,color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px)] bg-[length:auto,18px_18px,18px_18px] bg-[position:0_0,0_0,0_0] p-4">
          {totalAgents === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)]">
              Crie seu primeiro agente para acompanhar a distribuicao
              operacional.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--line-subtle)" />
                <XAxis
                  type="number"
                  dataKey="value"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                  allowDecimals={false}
                  tickFormatter={(value) =>
                    mode === "share"
                      ? formatChartPercent(Number(value))
                      : formatChartNumber(Number(value))
                  }
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={84}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      formatter={(value, name, item) => (
                        <>
                          <span className="text-[var(--fg-secondary)]">
                            {item.payload.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {name === "value" && mode === "share"
                              ? formatChartPercent(Number(value))
                              : formatChartNumber(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey="value" radius={6}>
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
