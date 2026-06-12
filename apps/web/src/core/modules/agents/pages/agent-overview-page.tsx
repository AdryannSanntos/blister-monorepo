"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { AgentUsageChart } from "src/core/modules/agents/components/agent-usage-chart";
import {
  useAgentRunsMock,
  useAgentStatsMock,
} from "src/core/modules/agents/hooks/use-agent-runs-mock";
import { useCutsOverview } from "src/core/modules/agents/hooks/use-cuts-overview";
import { Heading } from "src/core/shared/components/ui/heading";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type AgentOverviewPageProps = {
  agentSlug: string;
};

export const AgentOverviewPage = ({ agentSlug }: AgentOverviewPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const t = useTranslations("agents.overview");
  const locale = useLocale();

  const mockRuns = useAgentRunsMock(agent?.id ?? "");
  const mockStats = useAgentStatsMock(agent?.id ?? "", locale);
  const cutsOverview = useCutsOverview(locale);

  const isCuts = agentSlug === "cuts";

  const stats = isCuts ? cutsOverview.stats : mockStats;
  const recentRuns = useMemo(() => {
    if (isCuts) return cutsOverview.recentRuns;
    return mockRuns.runs.slice(0, 3).map((run) => ({
      id: run.id,
      title: run.title,
      preview: run.preview,
    }));
  }, [cutsOverview.recentRuns, isCuts, mockRuns.runs]);

  if (!agent) {
    return null;
  }

  return (
    <div data-testid="agent-overview-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={agent.name}
        description={agent.description}
        actions={<AgentNewRunButton routeSlug={agent.routeSlug} size="sm" />}
      >
        <AgentEntitlementGate agent={agent}>
          <div className="flex flex-col gap-6">
            <AgentOverviewStats
              totalRuns={stats.totalRuns}
              completedRuns={stats.completedRuns}
              approvedRuns={stats.approvedRuns}
              creditsUsed={stats.creditsUsed}
            />

            <AgentUsageChart data={stats.usageByDay} />

            {recentRuns.length > 0 ? (
              <div className="flex flex-col gap-4">
                <Heading level="h6" as="h2">
                  {t("recentTitle")}
                </Heading>
                <ul className="flex flex-col gap-2">
                  {recentRuns.map((run) => (
                    <li
                      key={run.id}
                      className="rounded-[var(--r-lg)] border border-[var(--line-default)] px-4 py-3"
                    >
                      <Paragraph className="font-medium">{run.title}</Paragraph>
                      {run.preview ? (
                        <Paragraph size="p6" tone="tertiary" className="mt-1 line-clamp-1">
                          {run.preview}
                        </Paragraph>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
