"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useMemo } from "react";

import { useCutsRunModalActions } from "src/core/modules/agents/components/cuts/cuts-run-modal-provider";
import {
  extractCutsFromRunDto,
  getRunSourceTitle,
  readSourceFileId,
} from "src/core/modules/agents/utils/cuts-run-display";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";

type CutsViewCutsActionProps = {
  run: AgentRunStatusDto;
};

const canViewRunCuts = (run: AgentRunStatusDto) =>
  extractCutsFromRunDto(run).length > 0 ||
  run.status === "COMPLETED" ||
  run.status === "PAUSED";

/**
 * Row action que abre o modal de resultados de cortes (o mesmo do fluxo de
 * execução) em modo "view", com os cortes reais do AgentRun. O consumo de
 * `useCutsRunModalActions` fica isolado nesta folha — consumi-lo no componente
 * da página re-renderiza toda a tabela a cada mudança do provider e entra em
 * loop com o focus-scope do dropdown.
 */
export const CutsViewCutsAction = memo(({ run }: CutsViewCutsActionProps) => {
  const t = useTranslations("cuts.results");
  const { handleOpenRunDetails } = useCutsRunModalActions();

  const sourceTitle = getRunSourceTitle(run.inputPayload);
  const initialCuts = useMemo(() => extractCutsFromRunDto(run), [run]);

  const handleViewCuts = useCallback(() => {
    handleOpenRunDetails({
      runId: run.id,
      sourceFileId: readSourceFileId(run.inputPayload),
      sourceFileName: sourceTitle,
      initialCuts,
    });
  }, [handleOpenRunDetails, initialCuts, run.id, run.inputPayload, sourceTitle]);

  const menuItems = useMemo(
    () => [
      {
        id: "view",
        label: t("viewCuts"),
        icon: Eye,
        onClick: handleViewCuts,
      },
    ],
    [handleViewCuts, t],
  );

  if (!canViewRunCuts(run)) return null;

  return (
    <TableRowActionsMenu
      ariaLabel={t("actionsMenu", { name: sourceTitle })}
      items={menuItems}
    />
  );
});

CutsViewCutsAction.displayName = "CutsViewCutsAction";
