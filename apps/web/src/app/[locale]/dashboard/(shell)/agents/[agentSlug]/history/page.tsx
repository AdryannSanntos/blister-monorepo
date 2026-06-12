import { notFound } from "next/navigation";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentHistoryPage } from "src/core/modules/agents/pages/agent-history-page";

type AgentHistoryRouteProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function AgentHistoryRoute({ params }: AgentHistoryRouteProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    notFound();
  }

  return <AgentHistoryPage agentSlug={agentSlug} />;
}
