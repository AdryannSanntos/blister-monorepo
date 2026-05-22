"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { authClient } from "src/core/shared/utils/auth-client";
import { AgentRunDetailSheet } from "../components/agent-run-detail-sheet";
import { AgentRunTable } from "../components/agent-run-table";
import { useAgentRuns } from "../hooks/use-agent-runs";

export function AgentHistoryPage() {
  const { activeOrgId } = useActiveOrganization();
  const { data: session } = authClient.useSession();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [historyFilters, setHistoryFilters] = useQueryStates({
    status: parseAsString.withDefault("all"),
    origin: parseAsString.withDefault("all"),
    scope: parseAsString.withDefault("all"),
    agentId: parseAsString.withDefault("all"),
  });

  const runs = useAgentRuns(
    activeOrgId,
    {
      ...(historyFilters.status !== "all"
        ? { status: historyFilters.status }
        : {}),
      ...(historyFilters.agentId !== "all"
        ? { agentId: historyFilters.agentId }
        : {}),
      ...(historyFilters.scope === "mine" ? { onlyOwnRuns: true } : {}),
    },
    { pollActive: true },
  );

  if (!activeOrgId) return null;

  return (
    <>
      <PageLayout
        eyebrow="Workspace"
        title="Histórico de runs"
        description="Acompanhe as execuções recentes dos agentes da company, com polling para runs em andamento e detalhe operacional controlado."
      >
        <AgentRunTable
          data={runs.data ?? []}
          currentUserId={session?.user?.id ?? null}
          filterValues={historyFilters as Record<string, string>}
          onFilterValuesChange={(values) =>
            void setHistoryFilters(
              values as {
                status: string;
                origin: string;
                scope: string;
                agentId: string;
              },
            )
          }
          onSelectRun={setSelectedRunId}
        />
      </PageLayout>
      <AgentRunDetailSheet
        orgId={activeOrgId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  );
}
