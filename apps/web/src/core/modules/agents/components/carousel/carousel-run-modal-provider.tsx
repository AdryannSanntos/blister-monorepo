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

import { CarouselRunModal } from "./carousel-run-modal";
import { CarouselRunStatusModal } from "./carousel-run-status-modal";
import { useCarouselRunModal } from "src/core/modules/agents/hooks/use-carousel-run-modal";

type CarouselRunModalActions = Pick<
  ReturnType<typeof useCarouselRunModal>,
  "handleOpen" | "handleClose"
>;

const CarouselRunModalActionsContext =
  createContext<CarouselRunModalActions | null>(null);

const CarouselRunModalHost = ({
  actionsRef,
  onReady,
}: {
  actionsRef: MutableRefObject<CarouselRunModalActions | null>;
  onReady: () => void;
}) => {
  const modal = useCarouselRunModal();
  actionsRef.current = { handleOpen: modal.handleOpen, handleClose: modal.handleClose };
  useEffect(() => { onReady(); }, [onReady]);

  return (
    <>
      <CarouselRunModal controller={modal} />
      <CarouselRunStatusModal
        open={modal.statusModalOpen}
        variant={modal.statusModalVariant}
        runId={modal.statusRunId}
        errorMessage={modal.statusErrorMessage}
        onClose={modal.handleCloseStatusModal}
        onRetry={modal.handleRetryFromStatusModal}
      />
    </>
  );
};

export const CarouselRunModalProvider = ({ children }: { children: ReactNode }) => {
  const actionsRef = useRef<CarouselRunModalActions | null>(null);
  const handleHostReady = useCallback(() => {}, []);

  const stableActions = useMemo<CarouselRunModalActions>(
    () => ({
      handleOpen: () => actionsRef.current?.handleOpen(),
      handleClose: () => actionsRef.current?.handleClose(),
    }),
    [],
  );

  return (
    <CarouselRunModalActionsContext.Provider value={stableActions}>
      {children}
      <CarouselRunModalHost actionsRef={actionsRef} onReady={handleHostReady} />
    </CarouselRunModalActionsContext.Provider>
  );
};

export const useCarouselRunModalActions = () => {
  const context = useContext(CarouselRunModalActionsContext);
  if (!context) throw new Error("useCarouselRunModalActions must be used within CarouselRunModalProvider");
  return context;
};
