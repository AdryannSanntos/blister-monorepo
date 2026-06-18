"use client";

import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { CutsNewRedirect } from "src/core/modules/agents/pages/cuts-new-redirect";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type AgentNewPageProps = {
  agentSlug: string;
};

export const AgentNewPage = ({ agentSlug }: AgentNewPageProps) => {
  const t = useTranslations("agents.new");
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    redirect("/dashboard");
  }

  return (
    <div data-testid="agent-new-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={t("title", { agent: agent.name })}
        description={t("description")}
      >
        <AgentEntitlementGate agent={agent}>
          <CutsNewRedirect />
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
