import { redirect } from "next/navigation";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { getAgentOverviewPath } from "src/core/modules/agents/utils/agent-paths";

type AgentIndexPageProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function AgentIndexPage({ params }: AgentIndexPageProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    redirect("/dashboard/marketplace");
  }

  redirect(getAgentOverviewPath(agentSlug));
}
