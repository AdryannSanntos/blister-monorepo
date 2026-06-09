"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  Card,
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
import { formatChartNumber } from "src/core/shared/components/charts/chart-formatters";
import type { RunStatusChartItem } from "../utils/dashboard-metrics";

type DashboardStatusChartProps = {
  data: RunStatusChartItem[];
  totalRuns: number;
};

export function DashboardStatusChart({
  data,
  totalRuns,
}: DashboardStatusChartProps) {
  const t = useTranslations("dashboard.homePage.charts.status");

  const chartConfig = {
    count: {
      label: t("legend"),
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  const completedCount =
    data.find((item) => item.fill === "var(--success)")?.count ?? 0;
  const completionRate =
    totalRuns === 0 ? 0 : Math.round((completedCount / totalRuns) * 100);

  return (
    <Card className="h-full border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              {t("total")}
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalRuns)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              {t("completionRate")}
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {completionRate}%
            </p>
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[image:linear-gradient(var(--bg-sunken),var(--bg-sunken)),linear-gradient(90deg,color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px)] bg-[length:auto,18px_18px,18px_18px] bg-[position:0_0,0_0,0_0] p-4">
          {totalRuns === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)]">
              {t("empty")}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--line-subtle)" />
                <XAxis
                  type="number"
                  dataKey="count"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                  allowDecimals={false}
                  tickFormatter={(value) => formatChartNumber(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={108}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      formatter={(value, _name, item) => (
                        <>
                          <span className="text-[var(--fg-secondary)]">
                            {item.payload.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {formatChartNumber(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" radius={6}>
                  {data.map((entry) => (
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
