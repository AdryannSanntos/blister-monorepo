import { notFound } from "next/navigation";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentOverviewPage } from "src/core/modules/agents/pages/agent-overview-page";
import { CarouselOverviewPage } from "src/core/modules/agents/pages/carousel-overview-page";

type AgentOverviewRouteProps = { params: Promise<{ agentSlug: string }> };

export default async function AgentOverviewRoute({ params }: AgentOverviewRouteProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);
  if (!agent) notFound();

  if (agent.id === "carousel") {
    return <CarouselOverviewPage agentSlug={agentSlug} />;
  }

  return <AgentOverviewPage agentSlug={agentSlug} />;
}
