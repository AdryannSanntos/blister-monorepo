import type { ReactNode } from "react";
import { AgentWorkspaceLayout } from "src/core/modules/agents/pages/agent-workspace-layout";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return (
    <AgentWorkspaceLayout agentId={agentId}>{children}</AgentWorkspaceLayout>
  );
}
