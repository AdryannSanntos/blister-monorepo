"use client";

import { createContext, useContext, type ReactNode } from "react";

import { CutsSourceModal } from "src/core/modules/agents/components/cuts/cuts-source-modal";
import { CutsStatusModal } from "src/core/modules/agents/components/cuts/cuts-status-modal";
import { useCutsRunModal } from "src/core/modules/agents/hooks/use-cuts-run-modal";

type CutsRunModalContextValue = ReturnType<typeof useCutsRunModal>;

const CutsRunModalContext = createContext<CutsRunModalContextValue | null>(null);

export const CutsRunModalProvider = ({ children }: { children: ReactNode }) => {
  const modal = useCutsRunModal();

  const handleViewOverview = () => {
    modal.handleReset();
  };

  return (
    <CutsRunModalContext.Provider value={modal}>
      {children}
      <CutsSourceModal
        open={modal.sourceOpen}
        localFile={modal.localFile}
        existingFileName={modal.hasExistingSource ? modal.sourceFileName : null}
        existingFileSize={modal.hasExistingSource ? modal.sourceFileSize : null}
        sourceFileName={modal.sourceFileName}
        hasSource={modal.hasSource}
        isStarting={modal.isStarting}
        onOpenChange={(nextOpen) => (nextOpen ? modal.handleOpen() : modal.handleCloseSource())}
        onLocalFileChange={modal.handleLocalFileChange}
        onSelectExistingFile={modal.handleSelectExistingFile}
        onStartRun={modal.handleStartRun}
      />
      <CutsStatusModal
        open={modal.statusOpen}
        phase={modal.statusPhase}
        sourceFileName={modal.sourceFileName}
        errorMessage={modal.errorMessage}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) modal.handleCloseStatus();
        }}
        onViewOverview={handleViewOverview}
        onRetry={modal.handleRetry}
      />
    </CutsRunModalContext.Provider>
  );
};

export const useCutsRunModalContext = () => {
  const context = useContext(CutsRunModalContext);
  if (!context) {
    throw new Error("useCutsRunModalContext must be used within CutsRunModalProvider");
  }
  return context;
};
