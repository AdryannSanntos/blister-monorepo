import { redirect } from "next/navigation";
import { getAgentOverviewPath } from "src/core/modules/agents/utils/agent-paths";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";

type AgentIndexPageProps = {
  params: Promise<{ agentSlug: string }>;
};

export default async function AgentIndexPage({ params }: AgentIndexPageProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    redirect("/dashboard");
  }

  redirect(getAgentOverviewPath(agentSlug));
}
