import { notFound } from "next/navigation";

import { isAgentUiId } from "src/core/modules/agents/config/agent-ui-config";
import { AgentSurfacePage } from "src/core/modules/agents/pages/agent-surface-page";

type AgentPageProps = {
  params: Promise<{ agentId: string }>;
};

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;

  if (!isAgentUiId(agentId)) {
    notFound();
  }

  return <AgentSurfacePage agentId={agentId} />;
}
