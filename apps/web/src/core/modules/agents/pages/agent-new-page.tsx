"use client";

import {
  type AgentCatalogEntry,
  getAgentByRouteSlug,
} from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { useTranslations } from "next-intl";

import { BriefAgentGeneration } from "src/core/modules/agents/components/generations/brief-agent-generation";
import { ResearchGeneration } from "src/core/modules/agents/components/generations/research-generation";
import { VideoEditorGeneration } from "src/core/modules/agents/components/generations/video-editor-generation";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { CutsNewRedirect } from "src/core/modules/agents/pages/cuts-new-redirect";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type AgentNewPageProps = {
  agentSlug: string;
};

const renderGeneration = (agent: AgentCatalogEntry) => {
  switch (agent.id) {
    case "video_editor":
      return <VideoEditorGeneration />;
    case "cuts":
      return <CutsNewRedirect />;
    case "research":
      return <ResearchGeneration />;
    default:
      return <BriefAgentGeneration agent={agent} />;
  }
};

export const AgentNewPage = ({ agentSlug }: AgentNewPageProps) => {
  const t = useTranslations("agents.new");
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    return null;
  }

  return (
    <div data-testid="agent-new-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={t("title", { agent: agent.name })}
        description={t("description")}
      >
        <AgentEntitlementGate agent={agent}>
          {renderGeneration(agent)}
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
