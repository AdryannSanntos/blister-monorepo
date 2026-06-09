"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type RagSourceSyncState =
  | "synced"
  | "stale"
  | "missing"
  | "failed"
  | "indexing";

export type CompanyRagSyncStatus = {
  companyId: string;
  isSynced: boolean;
  sources: Array<{
    sourceType: string;
    sourceId: string;
    title: string;
    state: RagSourceSyncState;
    contentHash: string;
  }>;
  staleCount: number;
};

export function useCompanyRagStatus() {
  return useQuery<CompanyRagSyncStatus>({
    queryKey: ["company", "rag-status"],
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyRagSyncStatus>(
        "/company/rag/status",
      );
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
