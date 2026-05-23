"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";
import { usePlatformQueryEnabled } from "./use-platform-admin";

export type PlatformRun = {
  id: string;
  organizationId: string;
  agentId: string;
  agentVersionId: string;
  status: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  totalTechnicalCost?: number;
  agent: {
    id: string;
    name: string;
    templateId?: string | null;
  };
  steps: Array<{
    id: string;
    blockType: string;
    status: string;
    createdAt: string;
  }>;
};

export type PlatformRunDetail = {
  run: PlatformRun & {
    inputPayload?: unknown;
    outputPayload?: unknown;
    errorMessage?: string | null;
  };
  costs: Array<{
    id: string;
    providerId?: string | null;
    modelId?: string | null;
    amount: number;
    currency: string;
  }>;
  creditEntries: Array<{
    id: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
  }>;
  auditSummary: Array<{ id: string; action: string; createdAt: string }>;
};

export type PlatformCostSummary = {
  totalCost: number;
  entries?: Array<{
    id: string;
    providerId?: string | null;
    modelId?: string | null;
    amount: number;
  }>;
  breakdown?: Array<{ key: string; amount: number }>;
};

export function usePlatformRuns(filters?: Record<string, string>) {
  const enabled = usePlatformQueryEnabled();

  return useQuery<PlatformRun[]>({
    queryKey: ["platform-runs", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformRun[]>(
        "/platform/agents/runs",
        { params: filters },
      );
      return data;
    },
    enabled,
  });
}

export function usePlatformRun(runId: string | null) {
  const platformEnabled = usePlatformQueryEnabled();

  return useQuery<PlatformRunDetail>({
    queryKey: ["platform-run", runId],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformRunDetail>(
        `/platform/agents/runs/${runId}`,
      );
      return data;
    },
    enabled: platformEnabled && Boolean(runId),
  });
}

export function usePlatformCosts(filters?: Record<string, string>) {
  const enabled = usePlatformQueryEnabled();

  return useQuery<PlatformCostSummary>({
    queryKey: ["platform-costs", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformCostSummary>(
        "/platform/costs",
        { params: filters },
      );
      return data;
    },
    enabled,
  });
}

export function usePlatformCostBreakdown(
  kind: "providers" | "models",
  filters?: Record<string, string>,
) {
  const enabled = usePlatformQueryEnabled();

  return useQuery<PlatformCostSummary>({
    queryKey: ["platform-cost-breakdown", kind, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformCostSummary>(
        `/platform/costs/${kind}`,
        { params: filters },
      );
      return data;
    },
    enabled,
  });
}
