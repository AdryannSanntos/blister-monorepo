"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { memo } from "react";

import { useCutsRunMenuItems } from "src/core/modules/agents/hooks/use-cuts-run-menu-items";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";

type CutsViewCutsActionProps = {
  run: AgentRunStatusDto;
};

/**
 * Row action that navigates to the cuts run detail page. Keeps router usage
 * isolated in this leaf so table rows do not re-render on unrelated modal state.
 */
export const CutsViewCutsAction = memo(({ run }: CutsViewCutsActionProps) => {
  const { items, ariaLabel, canView } = useCutsRunMenuItems(run);

  if (!canView) return null;

  return <TableRowActionsMenu ariaLabel={ariaLabel} items={items} />;
});

CutsViewCutsAction.displayName = "CutsViewCutsAction";
