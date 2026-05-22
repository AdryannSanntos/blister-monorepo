"use client";

import { type ReactNode } from "react";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { FullFocusLayout } from "src/core/shared/layouts/full-focus-layout";
import { AgentWorkspaceSidebar } from "../components/agent-workspace-sidebar";
import { useCompanyAgent } from "../hooks/use-agents";

type AgentWorkspacePageProps = {
  agentId: string;
  children: ReactNode;
};

export function AgentWorkspacePage({
  agentId,
  children,
}: AgentWorkspacePageProps) {
  const { activeOrgId } = useActiveOrganization();
  const agent = useCompanyAgent(activeOrgId, agentId);

  if (!activeOrgId) return null;

  if (agent.isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--bg-canvas)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <FullFocusLayout
      sidebar={
        <AgentWorkspaceSidebar
          agentId={agentId}
          agentName={agent.data?.name ?? "Agente"}
        />
      }
    >
      {children}
    </FullFocusLayout>
  );
}
