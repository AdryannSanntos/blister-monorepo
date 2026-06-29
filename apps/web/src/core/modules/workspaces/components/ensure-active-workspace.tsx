"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useWorkspaceContext } from "src/core/modules/workspaces/hooks/use-workspace-context";
import { pickDefaultOnboardedCompany } from "src/core/modules/workspaces/utils/pick-default-company";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "src/core/shared/utils/active-workspace";
import { queryClient } from "src/core/shared/utils/query-client";

export const EnsureActiveWorkspace = () => {
  const router = useRouter();
  const { data, isSuccess } = useWorkspaceContext();

  useEffect(() => {
    if (!isSuccess || !data) return;

    const activeId = getActiveWorkspaceId();
    const defaultCompany = pickDefaultOnboardedCompany(data.companies, activeId);

    if (!defaultCompany || defaultCompany.id === activeId) return;

    setActiveWorkspaceId(defaultCompany.id);
    queryClient.invalidateQueries();
    router.refresh();
  }, [data, isSuccess, router]);

  return null;
};
