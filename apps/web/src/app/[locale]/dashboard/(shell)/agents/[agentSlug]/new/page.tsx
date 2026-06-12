import { notFound } from "next/navigation";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentNewPage } from "src/core/modules/agents/pages/agent-new-page";

type AgentNewRouteProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function AgentNewRoute({ params }: AgentNewRouteProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    notFound();
  }

  return <AgentNewPage agentSlug={agentSlug} />;
}
