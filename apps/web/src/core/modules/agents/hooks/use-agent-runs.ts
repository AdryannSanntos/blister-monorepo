"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "success"
  | "awaiting_user_validation"
  | "error"
  | "cancelled";

export type RunStep = {
  id: string;
  blockKey: string;
  blockType: string;
  status: "queued" | "running" | "completed" | "success" | "error";
  inputPayload: unknown;
  outputPayload: unknown;
  errorMessage: string | null;
  retryCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  agentId: string;
  organizationId: string;
  status: RunStatus;
  queuePosition: number | null;
  inputPayload: unknown;
  outputPayload: unknown;
  errorMessage: string | null;
  creditDelta: number;
  technicalCost: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  steps?: RunStep[];
};

type ListRunsFilters = {
  agentId?: string;
  status?: string;
  onlyOwnRuns?: boolean;
};

const runsKey = (orgId: string, filters?: ListRunsFilters) =>
  [
    "agent-runs",
    orgId,
    filters?.agentId ?? null,
    filters?.status ?? null,
    filters?.onlyOwnRuns ?? null,
  ] as const;
const runKey = (orgId: string, runId: string) =>
  ["agent-run", orgId, runId] as const;

function hasActiveRuns(runs: AgentRun[] | undefined) {
  return Boolean(
    runs?.some((r) => r.status === "queued" || r.status === "running"),
  );
}

export function useAgentRuns(
  orgId: string | null | undefined,
  filters?: ListRunsFilters,
  opts?: { pollActive?: boolean },
) {
  return useQuery({
    queryKey: runsKey(orgId ?? "", filters),
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRun[]>(
        `/organizations/${orgId}/agent-runs`,
        { params: filters },
      );
      return data;
    },
    refetchInterval: (query) => {
      if (opts?.pollActive === false) return false;
      return hasActiveRuns(query.state.data as AgentRun[] | undefined)
        ? 3000
        : false;
    },
  });
}

export function useAgentRun(
  orgId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: runKey(orgId ?? "", runId ?? ""),
    enabled: Boolean(orgId && runId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRun>(
        `/organizations/${orgId}/agent-runs/${runId}`,
      );
      return data;
    },
    refetchInterval: (query) => {
      const run = query.state.data as AgentRun | undefined;
      if (!run) return false;
      return run.status === "queued" || run.status === "running" ? 2000 : false;
    },
  });
}

export function useCreateRun(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentRun>(
        `/organizations/${orgId}/agents/${agentId}/runs`,
        { input },
      );
      return data;
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] });
      }
    },
    onError: () => toast.error("Erro ao iniciar execução."),
  });
}
