"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "src/core/shared/components/ui/chart";
import {
  DatePickerInput,
  type DateRange,
} from "src/core/shared/components/ui/date-picker-input";
import {
  formatChartCurrency,
  formatChartDate,
  formatChartNumber,
} from "./chart-formatters";

type AgentRunsAreaChartProps = {
  runs: Array<{
    createdAt: string;
    technicalCost: number;
  }>;
};

const chartConfig = {
  runs: {
    label: "Execucoes",
    color: "var(--chart-1)",
  },
  cost: {
    label: "Custo tecnico",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function AgentRunsAreaChart({ runs }: AgentRunsAreaChartProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialFromDate = new Date(today);
  initialFromDate.setDate(initialFromDate.getDate() - 6);

  const [range, setRange] = useState<DateRange | undefined>({
    from: initialFromDate,
    to: today,
  });

  const rangeStart = range?.from ?? initialFromDate;
  const rangeEnd = range?.to ?? range?.from ?? today;
  const totalDays =
    Math.max(
      1,
      Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1,
    ) || 1;

  const chartData = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);

    const dayRuns = runs.filter((run) => {
      const runDate = new Date(run.createdAt);
      runDate.setHours(0, 0, 0, 0);
      return runDate.getTime() === date.getTime();
    });

    return {
      label:
        totalDays <= 14
          ? formatChartDate(date, { weekday: "short" })
          : formatChartDate(date, { day: "2-digit", month: "short" }),
      runs: dayRuns.length,
      cost: Number(
        dayRuns.reduce((total, run) => total + run.technicalCost, 0).toFixed(2),
      ),
    };
  });
  const totalRuns = chartData.reduce((total, item) => total + item.runs, 0);
  const totalCost = chartData.reduce((total, item) => total + item.cost, 0);
  const avgRuns = totalRuns === 0 ? 0 : totalRuns / chartData.length;

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <div>
          <CardTitle>Execucoes dos agentes</CardTitle>
          <CardDescription>
            Tendencia operacional com volume e custo tecnico em pt-BR.
          </CardDescription>
        </div>
        <CardAction className="min-w-[292px] self-center">
          <DatePickerInput
            mode="range"
            value={range}
            onChange={setRange}
            maxDate={today}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Execucoes no periodo
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalRuns)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Custo tecnico acumulado
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartCurrency(totalCost)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Media diaria
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(Number(avgRuns.toFixed(1)))}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[image:linear-gradient(var(--bg-sunken),var(--bg-sunken)),linear-gradient(90deg,color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px)] bg-[length:auto,18px_18px,18px_18px] bg-[position:0_0,0_0,0_0] p-4">
          {totalRuns === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)]">
              Nenhuma execucao foi registrada ainda neste workspace.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <AreaChart
                data={chartData}
                margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--line-subtle)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name) => (
                        <>
                          <span className="text-[var(--fg-secondary)]">
                            {name === "cost"
                              ? chartConfig.cost.label
                              : chartConfig.runs.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {name === "cost"
                              ? formatChartCurrency(Number(value))
                              : formatChartNumber(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <defs>
                  <linearGradient
                    id="dashboard-runs"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-runs)"
                      stopOpacity={0.38}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-runs)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="dashboard-cost"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-cost)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-cost)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="runs"
                  stroke="var(--color-runs)"
                  strokeWidth={2}
                  fill="url(#dashboard-runs)"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  fill="url(#dashboard-cost)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
