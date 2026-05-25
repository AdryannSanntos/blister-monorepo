"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type SuspensionType = "clarification" | "form" | "validation";
export type SuspensionStatus = "pending" | "answered" | "cancelled";

export type SuspensionField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "single_select" | "multi_select" | "number" | "boolean";
  required: boolean;
  options?: string[];
  allowOther?: boolean;
};

export type RunSuspension = {
  id: string;
  runId: string;
  blockKey: string;
  suspensionType: SuspensionType;
  status: SuspensionStatus;
  resolvedPayload: {
    title?: string;
    prompt?: string;
    fields?: SuspensionField[];
    metadata?: Record<string, unknown>;
  };
  createdAt: string;
  answeredAt: string | null;
};

const suspensionsKey = (orgId: string, runId: string) =>
  ["run-suspensions", orgId, runId] as const;

export function useRunSuspensions(
  orgId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: suspensionsKey(orgId ?? "", runId ?? ""),
    enabled: Boolean(orgId && runId),
    queryFn: async () => {
      const { data } = await apiClient.get<RunSuspension[]>(
        `/organizations/${orgId}/agent-runs/${runId}/suspensions`,
      );
      return data;
    },
    refetchInterval: (query) => {
      const suspensions = query.state.data as RunSuspension[] | undefined;
      return suspensions?.some((s) => s.status === "pending") ? 3000 : false;
    },
  });
}

export function useAnswerSuspension(
  orgId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      suspensionId,
      answers,
    }: {
      runId: string;
      suspensionId: string;
      answers: Record<string, unknown>;
    }) => {
      if (!orgId) throw new Error("orgId required");
      const { data } = await apiClient.post(
        `/organizations/${orgId}/agent-runs/${runId}/suspensions/${suspensionId}/respond`,
        { answers },
      );
      return data;
    },
    onSuccess: (_data, { runId }) => {
      if (orgId) {
        queryClient.invalidateQueries({
          queryKey: suspensionsKey(orgId, runId),
        });
        queryClient.invalidateQueries({
          queryKey: ["agent-run", orgId, runId],
        });
        queryClient.invalidateQueries({
          queryKey: ["agent-runs", orgId],
        });
      }
    },
    onError: () => toast.error("Erro ao responder suspensão."),
  });
}
