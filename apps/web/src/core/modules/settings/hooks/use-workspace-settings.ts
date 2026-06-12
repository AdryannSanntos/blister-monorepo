import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateWorkspaceSettingsDto,
  WorkspaceProfile,
} from "@company-os/types";
import { apiClient } from "src/core/shared/utils/api-client";
import {
  getActiveWorkspaceId,
  isPersonalWorkspace,
} from "src/core/shared/utils/active-workspace";

const settingsKeys = {
  all: ["workspace-settings"] as const,
  active: () => [...settingsKeys.all, getActiveWorkspaceId() ?? "default"] as const,
};

function settingsPath() {
  const workspaceId = getActiveWorkspaceId();
  return isPersonalWorkspace(workspaceId)
    ? "/personal-space/settings"
    : "/company/settings";
}

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: settingsKeys.active(),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceProfile>(settingsPath());
      return data;
    },
  });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateWorkspaceSettingsDto) => {
      const { data } = await apiClient.patch<WorkspaceProfile>(
        settingsPath(),
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
