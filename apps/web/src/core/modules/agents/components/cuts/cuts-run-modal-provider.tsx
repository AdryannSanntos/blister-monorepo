"use client";

import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { CutsRunModal } from "src/core/modules/agents/components/cuts/cuts-run-modal";
import { useCutsRunModal } from "src/core/modules/agents/hooks/use-cuts-run-modal";

type CutsRunModalActions = Pick<
  ReturnType<typeof useCutsRunModal>,
  "handleOpen" | "handleOpenRunDetails" | "handleClose"
>;

const CutsRunModalActionsContext =
  createContext<CutsRunModalActions | null>(null);

/**
 * Host isolado: mudanças de estado do modal (SSE, fase, cortes, etc.) ficam
 * neste subtree e não re-renderizam `{children}`. As ações são publicadas via
 * ref para um contexto estável que envolve a árvore inteira.
 */
const CutsRunModalHost = ({
  actionsRef,
  onReady,
}: {
  actionsRef: MutableRefObject<CutsRunModalActions | null>;
  onReady: () => void;
}) => {
  const modal = useCutsRunModal();

  actionsRef.current = {
    handleOpen: modal.handleOpen,
    handleOpenRunDetails: modal.handleOpenRunDetails,
    handleClose: modal.handleClose,
  };

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <CutsRunModal controller={modal} />;
};

export const CutsRunModalProvider = ({ children }: { children: ReactNode }) => {
  const actionsRef = useRef<CutsRunModalActions | null>(null);
  const handleHostReady = useCallback(() => {}, []);

  const stableActions = useMemo<CutsRunModalActions>(
    () => ({
      handleOpen: () => {
        actionsRef.current?.handleOpen();
      },
      handleOpenRunDetails: (params) => {
        actionsRef.current?.handleOpenRunDetails(params);
      },
      handleClose: () => {
        actionsRef.current?.handleClose();
      },
    }),
    [],
  );

  return (
    <CutsRunModalActionsContext.Provider value={stableActions}>
      {children}
      <CutsRunModalHost actionsRef={actionsRef} onReady={handleHostReady} />
    </CutsRunModalActionsContext.Provider>
  );
};

export const useCutsRunModalActions = () => {
  const context = useContext(CutsRunModalActionsContext);
  if (!context) {
    throw new Error(
      "useCutsRunModalActions must be used within CutsRunModalProvider",
    );
  }
  return context;
};

/** @deprecated Prefer `useCutsRunModalActions` — full modal state is internal to the host. */
export const useCutsRunModalContext = useCutsRunModalActions;
