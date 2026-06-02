"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import type { AgentInsights } from "src/core/modules/agents/hooks/use-agent-insights";
import {
  formatChartDate,
  formatChartNumber,
  formatChartPercent,
} from "src/core/shared/components/charts/chart-formatters";
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

const CHART_SURFACE_CLASSNAME =
  "rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[image:linear-gradient(var(--bg-sunken),var(--bg-sunken)),linear-gradient(90deg,color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px),linear-gradient(color-mix(in_oklch,var(--line-default)_58%,transparent)_1px,transparent_1px)] bg-[length:auto,18px_18px,18px_18px] bg-[position:0_0,0_0,0_0] p-4";

const TOOL_STATUS_META: Record<string, { label: string; color: string }> = {
  completed: { label: "Concluídas", color: "var(--chart-1)" },
  success: { label: "Concluídas", color: "var(--chart-1)" },
  running: { label: "Executando", color: "var(--chart-2)" },
  queued: { label: "Na fila", color: "var(--chart-3)" },
  error: { label: "Com erro", color: "var(--chart-5)" },
  failed: { label: "Com erro", color: "var(--chart-5)" },
  cancelled: { label: "Canceladas", color: "var(--chart-6)" },
};

const TOOL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const conversationChartConfig = {
  messages: {
    label: "Mensagens",
    color: "var(--chart-1)",
  },
  threads: {
    label: "Conversas novas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const healthChartConfig = {
  responseCoverageRate: {
    label: "Cobertura de resposta",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const genericChartConfig = {
  value: {
    label: "Valor",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function toolLabel(value: string) {
  if (value === "other") return "Outros";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AgentInsightsConversationChart({
  data,
  days,
}: {
  data: AgentInsights["dailyActivity"];
  days: number;
}) {
  const totalMessages = data.reduce((total, item) => total + item.messages, 0);
  const totalThreads = data.reduce((total, item) => total + item.threads, 0);
  const averageMessages = data.length > 0 ? totalMessages / data.length : 0;

  const chartData = data.map((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return {
      ...item,
      label: formatChartDate(date, { day: "2-digit", month: "short" }),
    };
  });

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <CardTitle>Volume de conversa</CardTitle>
        <CardDescription>
          Últimos {days} dias com foco em mensagens trocadas e novas conversas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Mensagens no período
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalMessages)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Conversas abertas
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalThreads)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Média por dia
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(Number(averageMessages.toFixed(1)))}
            </p>
          </div>
        </div>

        <div className={CHART_SURFACE_CLASSNAME}>
          {totalMessages === 0 && totalThreads === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)]">
              Ainda não existem conversas suficientes para mostrar tendência.
            </div>
          ) : (
            <ChartContainer config={conversationChartConfig} className="h-[260px] w-full">
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
                            {name === "threads"
                              ? conversationChartConfig.threads.label
                              : conversationChartConfig.messages.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {formatChartNumber(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <defs>
                  <linearGradient id="agent-insights-messages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-messages)" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="var(--color-messages)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="agent-insights-threads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-threads)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-threads)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="var(--color-messages)"
                  strokeWidth={2}
                  fill="url(#agent-insights-messages)"
                />
                <Area
                  type="monotone"
                  dataKey="threads"
                  stroke="var(--color-threads)"
                  strokeWidth={2}
                  fill="url(#agent-insights-threads)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentInsightsHealthChart({
  responseCoverageRate,
  activeThreads,
  averageMessagesPerThread,
  enabledTools,
  contextFiles,
  contextReferences,
}: {
  responseCoverageRate: number;
  activeThreads: number;
  averageMessagesPerThread: number;
  enabledTools: number;
  contextFiles: number;
  contextReferences: number;
}) {
  const chartData = [{ name: "Cobertura de resposta", responseCoverageRate }];

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <CardTitle>Saúde da conversa</CardTitle>
        <CardDescription>
          Relação entre conversas ativas, resposta do agente e densidade de contexto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Conversas ativas
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(activeThreads)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Média por conversa
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(Number(averageMessagesPerThread.toFixed(1)))}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Ferramentas habilitadas
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(enabledTools)}
            </p>
          </div>
        </div>

        <div className={`flex flex-1 items-center ${CHART_SURFACE_CLASSNAME}`}>
          <div className="relative w-full">
            <ChartContainer config={healthChartConfig} className="h-[260px] w-full">
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
                      labelFormatter={() => "Cobertura de resposta"}
                      formatter={(value) => (
                        <div className="space-y-1">
                          <div className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {formatChartPercent(Number(value))}
                          </div>
                          <div className="text-[var(--fg-tertiary)]">
                            {formatChartNumber(contextFiles)} arquivos · {formatChartNumber(contextReferences)} referências
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <RadialBar
                  dataKey="responseCoverageRate"
                  background={{ fill: "var(--bg-hover)" }}
                  cornerRadius={999}
                  fill="var(--color-responseCoverageRate)"
                />
              </RadialBarChart>
            </ChartContainer>

            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
              <p className="max-w-[160px] text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                Cobertura de resposta
              </p>
              <p className="mt-2 text-[34px] font-medium tabular-nums text-[var(--fg-primary)]">
                {formatChartPercent(responseCoverageRate)}
              </p>
              <p className="mt-2 text-[12px] text-[var(--fg-tertiary)]">
                {formatChartNumber(contextFiles + contextReferences)} fontes de contexto
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentInsightsToolStatusChart({
  data,
  totalToolCalls,
}: {
  data: AgentInsights["toolStatusBreakdown"];
  totalToolCalls: number;
}) {
  const chartData = data.map((item) => ({
    ...item,
    label: TOOL_STATUS_META[item.status]?.label ?? item.status,
    fill: TOOL_STATUS_META[item.status]?.color ?? "var(--chart-6)",
  }));
  const failedCalls = chartData
    .filter((item) => item.status === "error" || item.status === "failed")
    .reduce((total, item) => total + item.count, 0);
  const openCalls = chartData
    .filter((item) => item.status === "queued" || item.status === "running")
    .reduce((total, item) => total + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <CardTitle>Status das ferramentas</CardTitle>
        <CardDescription>
          Panorama das consultas e ferramentas usadas nas conversas recentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Tool calls
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalToolCalls)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Em andamento
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(openCalls)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Com erro
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(failedCalls)}
            </p>
          </div>
        </div>

        <div className={CHART_SURFACE_CLASSNAME}>
          {totalToolCalls === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)]">
              Quando o agente usar ferramentas, o status delas aparecerá aqui.
            </div>
          ) : (
            <ChartContainer config={genericChartConfig} className="h-[260px] w-full">
              <BarChart
                data={chartData}
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
                  width={126}
                  fontSize={12}
                  stroke="var(--fg-quaternary)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      formatter={(value, _name, item) => (
                        <>
                          <span className="text-[var(--fg-secondary)]">{item.payload.label}</span>
                          <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                            {formatChartNumber(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" radius={6}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
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

export function AgentInsightsTopToolsChart({
  data,
}: {
  data: AgentInsights["topTools"];
}) {
  const totalCalls = data.reduce((total, item) => total + item.count, 0);
  const chartData = data.map((item, index) => ({
    ...item,
    label: toolLabel(item.toolName),
    fill: TOOL_COLORS[index % TOOL_COLORS.length],
    share: totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0,
  }));
  const lead = chartData[0];

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-[var(--line-subtle)]">
        <CardTitle>Ferramentas mais usadas</CardTitle>
        <CardDescription>
          Ranking das ferramentas que mais apareceram nas respostas do agente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Uso total
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {formatChartNumber(totalCalls)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Ferramenta líder
            </p>
            <p className="mt-1.5 text-[20px] font-medium text-[var(--fg-primary)]">
              {lead?.label ?? "Sem dados"}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Participação líder
            </p>
            <p className="mt-1.5 text-[20px] font-medium tabular-nums text-[var(--fg-primary)]">
              {lead ? formatChartPercent(lead.share) : "0%"}
            </p>
          </div>
        </div>

        <div className={`grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px] ${CHART_SURFACE_CLASSNAME}`}>
          {totalCalls === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-[13px] text-[var(--fg-tertiary)] lg:col-span-2">
              As ferramentas ainda não foram usadas o suficiente para gerar ranking.
            </div>
          ) : (
            <>
              <ChartContainer config={genericChartConfig} className="h-[260px] w-full">
                <PieChart>
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 60 }}
                    content={
                      <ChartTooltipContent
                        hideIndicator
                        formatter={(value, _name, item) => (
                          <>
                            <span className="text-[var(--fg-secondary)]">{item.payload.label}</span>
                            <span className="font-mono font-medium tabular-nums text-[var(--fg-primary)]">
                              {formatChartNumber(Number(value))}
                            </span>
                          </>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={2}
                    stroke="var(--bg-sunken)"
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="space-y-3 self-center">
                {chartData.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-base)] px-3 py-2.5"
                  >
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--fg-tertiary)]">
                        {formatChartNumber(item.count)} usos · {formatChartPercent(item.share)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
