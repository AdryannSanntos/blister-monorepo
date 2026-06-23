"use client";

import { redirect } from "next/navigation";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { CutsResultsGrid } from "src/core/modules/agents/components/cuts/cuts-results-grid";
import { useCutsOverview } from "src/core/modules/agents/hooks/use-cuts-overview";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type AgentOverviewPageProps = {
  agentSlug: string;
};

export const AgentOverviewPage = ({ agentSlug }: AgentOverviewPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const overview = useCutsOverview();

  if (!agent) {
    redirect("/dashboard");
  }

  const isCutsAgent = agent.routeSlug === "cuts";

  return (
    <div data-testid="agent-overview-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={agent.name}
        description={agent.description}
        actions={<AgentNewRunButton routeSlug={agent.routeSlug} size="sm" />}
      >
        <AgentEntitlementGate agent={agent}>
          <div className="flex flex-col gap-8">
            <AgentOverviewStats
              totalRuns={overview.stats.totalRuns}
              completedRuns={overview.stats.completedRuns}
              approvedRuns={overview.stats.approvedRuns}
              creditsUsed={overview.stats.creditsUsed}
            />

            {isCutsAgent ? (
              <CutsResultsGrid
                runs={overview.viewableRuns}
                isLoading={overview.isLoading}
              />
            ) : null}
          </div>
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
