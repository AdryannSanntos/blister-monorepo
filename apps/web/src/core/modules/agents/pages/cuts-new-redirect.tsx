"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/routing";

import { useCutsRunModalContext } from "src/core/modules/agents/components/cuts/cuts-run-modal-provider";
import { getAgentOverviewPath } from "src/core/modules/agents/utils/agent-paths";

/** Redirects legacy /new route to overview and opens the cuts run modal. */
export const CutsNewRedirect = () => {
  const router = useRouter();
  const cutsModal = useCutsRunModalContext();

  useEffect(() => {
    cutsModal.handleOpen();
    router.replace(getAgentOverviewPath("cuts"));
  }, [cutsModal, router]);

  return (
    <div data-testid="cuts-new-redirect" className="sr-only" aria-hidden>
      Redirecting to cuts overview
    </div>
  );
};
