"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { AgentWorkspaceSidebar } from "src/core/modules/agents/components/agent-workspace-sidebar";
import { useCompanyAgent } from "src/core/modules/agents/hooks/use-agents";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";

type Props = {
  agentId: string;
  children: ReactNode;
};

export function AgentWorkspaceLayout({ agentId, children }: Props) {
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const agent = useCompanyAgent(orgId, agentId);

  useEffect(() => {
    if (agent.data?.status === "archived") {
      router.replace("/dashboard/workspace/agents");
    }
  }, [agent.data?.status, router]);

  useEffect(() => {
    if (!agent.data || agent.isLoading) return;
    const isOnboarding = pathname.endsWith("/onboarding");
    if (agent.data.status === "draft" && !isOnboarding) {
      router.replace(`/dashboard/workspace/agents/${agentId}/onboarding`);
    }
    if (agent.data.status !== "draft" && isOnboarding) {
      router.replace(`/dashboard/workspace/agents/${agentId}/chat`);
    }
  }, [agent.data, agent.isLoading, pathname, agentId, router]);

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

  if (agent.data.status === "archived") {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--bg-canvas)] text-[var(--fg-tertiary)]">
        Redirecionando para a lista de agentes...
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <AgentWorkspaceSidebar
        orgId={orgId}
        agent={agent.data}
        activeThreadId={threadId}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 pl-0">
        <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] shadow-[var(--shadow-sm)]">
          {children}
        </div>
      </main>
    </div>
  );
}
