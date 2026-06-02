"use client";

import { BarChart2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useAgentInsights } from "src/core/modules/agents/hooks/use-agent-insights";
import {
  AgentInsightsHealthChart,
  AgentInsightsConversationChart,
  AgentInsightsToolStatusChart,
  AgentInsightsTopToolsChart,
} from "src/core/modules/agents/components/insights/agent-insights-charts";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  formatChartNumber,
  formatChartPercent,
} from "src/core/shared/components/charts/chart-formatters";

function statusLabel(status: "draft" | "active" | "archived") {
  if (status === "active") return "Ativo";
  if (status === "archived") return "Arquivado";
  return "Rascunho";
}

function statusVariant(
  status: "draft" | "active" | "archived",
): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "archived") return "destructive";
  return "secondary";
}

export function AgentInsightsPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const { cannot, isLoading: abilityLoading } = useAbility();
  const insights = useAgentInsights(orgId, agentId);

  if (!abilityLoading && cannot("read", "Agent")) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--fg-tertiary)]">
        Você não tem permissão para ver insights operacionais deste agente.
      </div>
    );
  }

  if (insights.isError) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--fg-tertiary)]">
        Não foi possível carregar os insights deste agente agora.
      </div>
    );
  }

  if (!orgId || insights.isLoading || !insights.data) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-base)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const { agent, summary, dailyActivity, toolStatusBreakdown, topTools } = insights.data;

  return (
    <AgentContentLayout
      icon={BarChart2}
      title="Insights"
      subtitle={`Leitura operacional de ${agent.name} nos últimos ${insights.data.window.days} dias.`}
      actions={<Badge variant={statusVariant(agent.status)}>{statusLabel(agent.status)}</Badge>}
      contentClassName="min-h-0 w-full flex-1 overflow-y-auto px-6 py-6"
    >
      <div className="w-full space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-0">
              <CardDescription>Conversas no período</CardDescription>
              <CardTitle className="text-[24px] tabular-nums">
                {formatChartNumber(summary.totalThreads)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                {formatChartNumber(summary.activeThreads)} conversas tiveram atividade no período analisado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription>Mensagens trocadas</CardDescription>
              <CardTitle className="text-[24px] tabular-nums">
                {formatChartNumber(summary.totalMessages)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                {formatChartNumber(summary.userMessages)} do usuário e {formatChartNumber(summary.assistantMessages)} do agente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription>Cobertura de resposta</CardDescription>
              <CardTitle className="text-[24px] tabular-nums">
                {formatChartPercent(summary.responseCoverageRate)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                Média de {formatChartNumber(Number(summary.averageMessagesPerThread.toFixed(1)))} mensagens por conversa ativa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription>Ferramentas acionadas</CardDescription>
              <CardTitle className="text-[24px] tabular-nums">
                {formatChartNumber(summary.totalToolCalls)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                {formatChartNumber(summary.failedToolCalls)} com erro, {formatChartNumber(summary.contextFiles)} arquivos e {formatChartNumber(summary.contextReferences)} referências no contexto.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AgentInsightsConversationChart
            data={dailyActivity}
            days={insights.data.window.days}
          />
          <AgentInsightsHealthChart
            responseCoverageRate={summary.responseCoverageRate}
            activeThreads={summary.activeThreads}
            averageMessagesPerThread={summary.averageMessagesPerThread}
            enabledTools={summary.enabledTools}
            contextFiles={summary.contextFiles}
            contextReferences={summary.contextReferences}
          />
          <AgentInsightsToolStatusChart
            data={toolStatusBreakdown}
            totalToolCalls={summary.totalToolCalls}
          />
          <AgentInsightsTopToolsChart data={topTools} />
        </div>
      </div>
    </AgentContentLayout>
  );
}
