import { AgentSettingsPageClient } from "./page-client";

export default async function AgentSettingsRoute({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentSettingsPageClient agentId={agentId} />;
}
