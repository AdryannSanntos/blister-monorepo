import { AgentWorkflowPageClient } from "./page-client";

export default async function AgentWorkflowRoute({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentWorkflowPageClient agentId={agentId} />;
}
