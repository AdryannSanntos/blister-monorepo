"use client";

import { AgentWorkspacePage } from "src/core/modules/agents/pages/agent-workspace-page";
import { useAgentRuns } from "src/core/modules/agents/hooks/use-agent-runs";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Badge } from "src/core/shared/components/ui/badge";

export function AgentExecutionsPageClient({ agentId }: { agentId: string }) {
  const { activeOrgId } = useActiveOrganization();
  const runs = useAgentRuns(activeOrgId, { agentId }, { pollActive: true });

  return (
    <AgentWorkspacePage agentId={agentId}>
      <div className="p-6">
        <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">
          Execuções
        </h2>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Histórico de execuções deste agente.
        </p>
        <div className="mt-6 space-y-3">
          {runs.data?.length === 0 && (
            <p className="text-[13px] text-[var(--fg-tertiary)]">
              Nenhuma execução registrada.
            </p>
          )}
          {runs.data?.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-3"
            >
              <div>
                <p className="font-mono text-[12px] text-[var(--fg-secondary)]">
                  {run.id.slice(0, 8)}
                </p>
                <p className="text-[12px] text-[var(--fg-tertiary)]">
                  {new Date(run.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge
                variant={
                  run.status === "success"
                    ? "success"
                    : run.status === "error"
                      ? "destructive"
                      : run.status === "running"
                        ? "warning"
                        : "secondary"
                }
              >
                {run.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </AgentWorkspacePage>
  );
}
