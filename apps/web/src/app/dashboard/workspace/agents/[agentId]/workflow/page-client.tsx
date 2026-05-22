"use client";

import { AgentWorkspacePage } from "src/core/modules/agents/pages/agent-workspace-page";

export function AgentWorkflowPageClient({ agentId }: { agentId: string }) {
  return (
    <AgentWorkspacePage agentId={agentId}>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[15px] font-medium text-[var(--fg-primary)]">
            Editor de workflow
          </p>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            O editor visual de blocos do agente será exibido aqui.
          </p>
        </div>
      </div>
    </AgentWorkspacePage>
  );
}
