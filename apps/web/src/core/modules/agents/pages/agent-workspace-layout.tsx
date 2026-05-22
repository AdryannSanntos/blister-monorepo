"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { AgentWorkspaceSidebar } from "src/core/modules/agents/components/agent-workspace-sidebar";
import { useAgentRuns } from "src/core/modules/agents/hooks/use-agent-runs";
import { useCompanyAgent } from "src/core/modules/agents/hooks/use-agents";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";

type Props = {
  agentId: string;
  children: ReactNode;
};

export function AgentWorkspaceLayout({ agentId, children }: Props) {
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const agent = useCompanyAgent(orgId, agentId);
  const runsFilters = useMemo(
    () => ({ agentId, status: "running" }),
    [agentId],
  );
  const runs = useAgentRuns(orgId, runsFilters, { pollActive: true });

  const hasActiveRun = Boolean(
    runs.data?.some((r) => r.status === "queued" || r.status === "running"),
  );

  if (!activeOrgId || agent.isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--bg-canvas)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!agent.data) {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--bg-canvas)] text-[var(--fg-tertiary)]">
        Agente não encontrado.
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <AgentWorkspaceSidebar
        orgId={orgId}
        agent={agent.data}
        activeThreadId={threadId}
        hasActiveRun={hasActiveRun}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
