import { notFound } from "next/navigation";

import { CarouselRunDetailPage } from "src/core/modules/agents/pages/carousel-run-detail-page";
import { CutsRunDetailPage } from "src/core/modules/agents/pages/cuts-run-detail-page";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";

type AgentRunRouteProps = {
  params: Promise<{ agentSlug: string; runId: string }>;
};

export default async function AgentRunRoute({ params }: AgentRunRouteProps) {
  const { agentSlug, runId } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    notFound();
  }

  if (agent.id === "cuts") {
    return <CutsRunDetailPage agentSlug={agentSlug} runId={runId} />;
  }

  if (agent.id === "carousel") {
    return <CarouselRunDetailPage agentSlug={agentSlug} runId={runId} />;
  }

  notFound();
}
