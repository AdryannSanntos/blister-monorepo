import { notFound } from "next/navigation";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentSettingsPage } from "src/core/modules/agents/pages/agent-settings-page";

type AgentSettingsRouteProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function AgentSettingsRoute({ params }: AgentSettingsRouteProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    notFound();
  }

  return <AgentSettingsPage agentSlug={agentSlug} />;
}
