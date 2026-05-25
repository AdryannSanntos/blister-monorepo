"use client";

import { useState } from "react";
import { RadialBar, RadialBarChart } from "recharts";
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

type WorkspaceReadinessRadialChartProps = {
  value: number;
  totalAgents: number;
  activeAgents: number;
  teamMembers: number;
  pendingInvitations: number;
};

type FocusMode = "general" | "team" | "automation";

const chartConfig = {
  readiness: {
    label: "Prontidao",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function WorkspaceReadinessRadialChart({
  value,
  totalAgents,
  activeAgents,
  teamMembers,
  pendingInvitations,
}: WorkspaceReadinessRadialChartProps) {
  const [focus, setFocus] = useState<FocusMode>("general");
  const teamHealth =
    teamMembers === 0
      ? 0
      : Math.max(
          30,
          Math.round(((teamMembers - pendingInvitations) / teamMembers) * 100),
        );
  const automationHealth =
    totalAgents === 0 ? 0 : Math.round((activeAgents / totalAgents) * 100);
  const focusMap = {
    general: {
      label: "Prontidao geral",
      description:
        "Combina estrutura da equipe e capacidade de automacao ativa.",
      value,
    },
    team: {
      label: "Saude da equipe",
      description: "Considera membros ativos versus convites ainda pendentes.",
      value: teamHealth,
    },
    automation: {
      label: "Saude da automacao",
      description: "Mede a proporcao de agentes ativos dentro do workspace.",
      value: automationHealth,
    },
  } satisfies Record<
    FocusMode,
    { label: string; description: string; value: number }
  >;
  const currentFocus = focusMap[focus];
  const chartData = [
    { name: currentFocus.label, readiness: currentFocus.value },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <div>
          <CardTitle>Prontidao do workspace</CardTitle>
          <CardDescription>
            Leitura rapida de setup, equipe e capacidade ativa.
          </CardDescription>
        </div>
        <CardAction className="w-[158px] self-center">
          <Select
            value={focus}
            onValueChange={(value) => setFocus(value as FocusMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Geral</SelectItem>
              <SelectItem value="team">Equipe</SelectItem>
              <SelectItem value="automation">Automacao</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Indicador atual
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartPercent(currentFocus.value)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Agentes ativos
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(activeAgents)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Membros ativos
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(teamMembers)}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[image:linear-gradient(var(--bg-sunken),var(--bg-sunken)),linear-gradient(90deg,color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px)] bg-[length:auto,18px_18px,18px_18px] bg-[position:0_0,0_0,0_0] p-4">
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <RadialBarChart
                data={chartData}
                innerRadius="72%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <ChartTooltip
                  wrapperStyle={{ zIndex: 60 }}
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      labelFormatter={() => currentFocus.label}
                      formatter={(chartValue) => (
                        <div className="space-y-1">
                          <div className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {formatChartPercent(Number(chartValue))}
                          </div>
                          <div className="text-[var(--fg-tertiary)]">
                            {formatChartNumber(activeAgents)} agentes ativos ·{" "}
                            {formatChartNumber(teamMembers)} membros ·{" "}
                            {formatChartNumber(pendingInvitations)} convites{" "}
                            pendentes
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <RadialBar
                  dataKey="readiness"
                  background={{ fill: "var(--bg-hover)" }}
                  cornerRadius={999}
                  fill="var(--color-readiness)"
                />
              </RadialBarChart>
            </ChartContainer>

            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
              <p className="max-w-[140px] text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                {currentFocus.label}
              </p>
              <p className="mt-2 text-[34px] font-medium tabular-nums text-[var(--fg-primary)]">
                {formatChartPercent(currentFocus.value)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
