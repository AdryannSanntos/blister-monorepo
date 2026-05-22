import { AgentChatPageClient } from "./page-client";

export default async function AgentChatRoute({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentChatPageClient agentId={agentId} />;
}
