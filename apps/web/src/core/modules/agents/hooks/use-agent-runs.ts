"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

type AgentSummary = {
  id: string;
  name: string;
  templateId?: string | null;
};

type AgentVersionSummary = {
  id: string;
  versionNumber: number;
  status: string;
};

export type AgentRunStep = {
  id: string;
  blockKey: string;
  blockType: string;
  status: string;
  inputPayload?: unknown;
  outputPayload?: unknown;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  organizationId: string;
  agentId: string;
  agentVersionId: string;
  status: string;
  inputPayload?: unknown;
  outputPayload?: unknown;
  errorMessage?: string | null;
  createdByUserId: string;
  creditDelta?: number;
  technicalCost?: number;
  createdAt: string;
  updatedAt: string;
  agent: AgentSummary;
  agentVersion?: AgentVersionSummary;
  steps?: AgentRunStep[];
};

export type AgentRunDetail = {
  run: AgentRun;
  creditEntries: CreditLedgerEntry[];
  technicalCosts: TechnicalCostEntry[];
};

export type CreditBalance = {
  organizationId: string;
  balance: number;
};

export type CreditLedgerEntry = {
  id: string;
  organizationId: string;
  runId?: string | null;
  entryType: string;
  amount: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  createdByUserId?: string | null;
  createdAt: string;
};

export type TechnicalCostEntry = {
  id: string;
  runId?: string | null;
  providerId?: string | null;
  modelId?: string | null;
  amount: number;
  currency: string;
  unit: string;
  createdAt: string;
};

type UseAgentRunsOptions = {
  pollActive?: boolean;
};

function invalidateRuns(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["agent-runs", orgId] }),
    queryClient.invalidateQueries({ queryKey: ["agent-run", orgId] }),
  ]);
}

export function useRunAgent(orgId: string | null, agentId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<AgentRun>(
        `/organizations/${orgId}/agents/${agentId}/runs`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateRuns(queryClient, orgId);
      toast.success("Run enfileirado.");
    },
    onError: () => toast.error("Erro ao enfileirar run."),
  });
}

export function useAgentRuns(
  orgId: string | null,
  filters?: Record<string, string | boolean>,
  options?: UseAgentRunsOptions,
) {
  return useQuery<AgentRun[]>({
    queryKey: ["agent-runs", orgId, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRun[]>(
        `/organizations/${orgId}/agents/runs`,
        { params: filters },
      );
      return data;
    },
    enabled: Boolean(orgId),
    refetchInterval: (query) => {
      if (!options?.pollActive) return false;
      const runs = query.state.data as AgentRun[] | undefined;
      return runs?.some(
        (run) => run.status === "queued" || run.status === "running",
      )
        ? 3000
        : false;
    },
  });
}

export function useAgentRun(
  orgId: string | null,
  runId: string | null,
  options?: UseAgentRunsOptions,
) {
  return useQuery<AgentRunDetail>({
    queryKey: ["agent-run", orgId, runId],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentRunDetail>(
        `/organizations/${orgId}/agents/runs/${runId}`,
      );
      return data;
    },
    enabled: Boolean(orgId && runId),
    refetchInterval: (query) => {
      if (!options?.pollActive) return false;
      const run = (query.state.data as AgentRunDetail | undefined)?.run;
      return run && (run.status === "queued" || run.status === "running")
        ? 3000
        : false;
    },
  });
}

export function useOrganizationCredits(orgId: string | null) {
  return useQuery<CreditBalance>({
    queryKey: ["organization-credits", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<CreditBalance>(
        `/organizations/${orgId}/credits`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useOrganizationCreditLedger(orgId: string | null) {
  return useQuery<CreditLedgerEntry[]>({
    queryKey: ["organization-credit-ledger", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<CreditLedgerEntry[]>(
        `/organizations/${orgId}/credits/ledger`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}
