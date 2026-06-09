"use client";

import type {
  AgentRunEvent,
  ApproveAgentRunDto,
  EditAgentRunOutputDto,
  RegenerateAgentRunDto,
  RejectAgentRunDto,
  ResumeAgentRequest,
  RunAgentRequest,
} from "@company-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

type StartRunResponse = { runId: string; status: string };
type ResumeRunResponse = { runId: string; status: string };

export function useStartAgentRun(agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<StartRunResponse, Error, RunAgentRequest>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<StartRunResponse>(
        `/agents/${agentId}/run`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-runs"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}

export function useResumeAgentRun(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<ResumeRunResponse, Error, ResumeAgentRequest>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<ResumeRunResponse>(
        `/agents/runs/${runId}/resume`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
    },
  });
}

export function useCancelAgentRun(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ runId: string; status: string }, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/agents/runs/${runId}/cancel`);
      return data;
    },
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
    },
  });
}

export function useApproveAgentRun(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, ApproveAgentRunDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post(
        `/agents/runs/${runId}/approve`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-runs"] });
    },
  });
}

export function useRejectAgentRun(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, RejectAgentRunDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post(
        `/agents/runs/${runId}/reject`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-runs"] });
    },
  });
}

export function useEditAgentRunOutput(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, EditAgentRunOutputDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch(
        `/agents/runs/${runId}/output`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
    },
  });
}

export function useRegenerateAgentRun(runId: string | null, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation<StartRunResponse, Error, RegenerateAgentRunDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<StartRunResponse>(
        `/agents/runs/${runId}/regenerate`,
        dto,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", agentId] });
      queryClient.invalidateQueries({ queryKey: ["all-agent-runs"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["agent-run", data.runId] });
    },
  });
}

export type { AgentRunEvent };
