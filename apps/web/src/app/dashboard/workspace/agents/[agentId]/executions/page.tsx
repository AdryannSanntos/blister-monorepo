import { AgentExecutionsPageClient } from "./page-client";

export default async function AgentExecutionsRoute({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentExecutionsPageClient agentId={agentId} />;
}
