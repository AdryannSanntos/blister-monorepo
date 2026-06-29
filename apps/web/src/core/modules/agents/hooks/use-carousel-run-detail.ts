"use client";

import type {
  CarouselDesignPlan,
  CarouselSlideContent,
} from "@company-os/types";
import { type Query, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "src/core/shared/utils/api-client";

import type { CarouselRunStepId } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CAROUSEL_RUN_STEPS,
  getCarouselStepIndex,
  getCarouselStepPhaseStatus,
  isCarouselStepAccessible,
  type CarouselPhaseStatus,
  type CarouselRunPhaseSnapshot,
} from "src/core/modules/agents/components/carousel/carousel-run-steps";
import { shouldKeepRunStreamOpen } from "../utils/apply-agent-run-event";
import {
  deriveCarouselPhases,
  extractCarouselOutputFromRun,
  extractDesignPlanFromRun,
  extractIdeasFromRun,
  extractPhaseErrorMessage,
  extractSlideContentsFromRun,
  isCarouselRunActive,
  isRunAwaitingContentApproval,
  isRunAwaitingDesignApproval,
  isRunAwaitingIdeaSelection,
  readImageUploads,
  readSelectedIdeaId,
  resolveActiveCarouselStep,
} from "../utils/carousel-run-display";
import { runPollIntervalMs } from "../utils/run-poll-interval";
import { type AgentRunWithSteps, useAgentRun } from "./use-agent-run";
import { useResumeAgentRun } from "./use-agent-run-mutations";
import { useAgentRunStream } from "./use-agent-run-stream";
import { carouselRunsQueryKey } from "./use-carousel-runs";
import { carouselStatsQueryKey } from "./use-carousel-stats";

const CAROUSEL_AGENT_ID = "carousel";

export type { CarouselPhaseStatus } from "src/core/modules/agents/components/carousel/carousel-run-steps";

export const useCarouselRunDetail = (runId: string) => {
  const queryClient = useQueryClient();
  const resumeRun = useResumeAgentRun(runId, CAROUSEL_AGENT_ID);

  const [activeStep, setActiveStep] = useState<CarouselRunStepId>("ideas");
  const [localSelectedIdeaId, setLocalSelectedIdeaId] = useState<string | null>(
    null,
  );
  const [localImageUploads, setLocalImageUploads] = useState<
    Record<string, string>
  >({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runPollInterval = useCallback((query: Query<AgentRunWithSteps>) => {
    const status = query.state.data?.run.status;
    const pauseReason = query.state.data?.run.pauseReason;
    return runPollIntervalMs(status, pauseReason);
  }, []);

  const {
    data: runData,
    isLoading,
    isError,
  } = useAgentRun(runId, { refetchInterval: runPollInterval });

  const run = runData?.run;
  const steps = runData?.steps;

  const shouldStream =
    Boolean(runId) && shouldKeepRunStreamOpen(run) && isCarouselRunActive(run);

  useAgentRunStream(runId, CAROUSEL_AGENT_ID, shouldStream);

  const phases = useMemo(
    () =>
      run
        ? deriveCarouselPhases({ run, steps })
        : ({
            ideas: { status: "idle" as const },
            content: { status: "idle" as const },
            design: { status: "idle" as const },
            preview: { status: "idle" as const },
          } satisfies CarouselRunPhaseSnapshot),
    [run, steps],
  );

  const phaseErrors = useMemo(() => {
    if (!run) {
      return {
        ideas: null,
        content: null,
        design: null,
        preview: null,
      };
    }

    return {
      ideas: extractPhaseErrorMessage({ phase: "ideas", run, steps }),
      content: extractPhaseErrorMessage({ phase: "content", run, steps }),
      design: extractPhaseErrorMessage({ phase: "design", run, steps }),
      preview: extractPhaseErrorMessage({ phase: "preview", run, steps }),
    };
  }, [run, steps]);

  const clearErrorMessage = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const ideasData = useMemo(
    () => extractIdeasFromRun({ steps }),
    [steps],
  );

  const contentData = useMemo(
    () =>
      run
        ? extractSlideContentsFromRun({ run, steps })
        : ([] as CarouselSlideContent[]),
    [run, steps],
  );

  const designPlan = useMemo(
    () => (run ? extractDesignPlanFromRun({ run, steps }) : null),
    [run, steps],
  );

  const output = useMemo(
    () => (run ? extractCarouselOutputFromRun({ run, steps }) : null),
    [run, steps],
  );

  const selectedIdeaId =
    localSelectedIdeaId ?? (run ? readSelectedIdeaId(run.inputPayload) : null);

  const imageUploads = useMemo(() => {
    const fromRun = run ? readImageUploads(run.inputPayload) : {};
    return { ...fromRun, ...localImageUploads };
  }, [run, localImageUploads]);

  useEffect(() => {
    if (!run) return;
    const nextStep = resolveActiveCarouselStep({ run, steps });
    setActiveStep(nextStep);
  }, [run, steps]);

  const invalidateCarouselQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: carouselRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: carouselStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", CAROUSEL_AGENT_ID] });
  }, [queryClient]);

  const goToStep = useCallback(
    (stepId: CarouselRunStepId) => {
      if (!isCarouselStepAccessible(stepId, phases)) return;
      setActiveStep(stepId);
    },
    [phases],
  );

  const goToAdjacentStep = useCallback(
    (direction: "prev" | "next") => {
      const currentIndex = getCarouselStepIndex(activeStep);
      const delta = direction === "prev" ? -1 : 1;
      for (
        let index = currentIndex + delta;
        index >= 0 && index < CAROUSEL_RUN_STEPS.length;
        index += delta
      ) {
        const stepId = CAROUSEL_RUN_STEPS[index]?.id;
        if (stepId && isCarouselStepAccessible(stepId, phases)) {
          setActiveStep(stepId);
          return;
        }
      }
    },
    [activeStep, phases],
  );

  const selectIdea = useCallback(
    async (id: string) => {
      if (!isRunAwaitingIdeaSelection(run)) return;
      setLocalSelectedIdeaId(id);
      setActiveStep("content");
      try {
        await resumeRun.mutateAsync({ formData: { selectedIdeaId: id } });
        invalidateCarouselQueries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Erro ao selecionar ideia",
        );
      }
    },
    [run, resumeRun, invalidateCarouselQueries],
  );

  const updateIdeaSelection = useCallback((id: string) => {
    setLocalSelectedIdeaId(id);
  }, []);

  const approveContent = useCallback(
    async (data: CarouselSlideContent[]) => {
      if (!isRunAwaitingContentApproval(run)) return;
      setActiveStep("design");
      try {
        await resumeRun.mutateAsync({
          formData: { contentApproved: true, slides: data },
        });
        invalidateCarouselQueries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Erro ao aprovar conteúdo",
        );
      }
    },
    [run, resumeRun, invalidateCarouselQueries],
  );

  const updateContent = useCallback((_data: CarouselSlideContent[]) => {
    // Review-only local edits; persisted on approve.
  }, []);

  const rejectContent = useCallback(async () => {
    if (!isRunAwaitingContentApproval(run)) return;
    setActiveStep("content");
    try {
      await resumeRun.mutateAsync({ formData: { contentApproved: false } });
      invalidateCarouselQueries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao regenerar conteúdo",
      );
    }
  }, [run, resumeRun, invalidateCarouselQueries]);

  const setImageUpload = useCallback((uploadKey: string, fileId: string) => {
    setLocalImageUploads((prev) => {
      if (!fileId.trim()) {
        const next = { ...prev };
        delete next[uploadKey];
        return next;
      }
      return { ...prev, [uploadKey]: fileId };
    });
  }, []);

  const approveDesign = useCallback(
    async (plan: CarouselDesignPlan, uploads: Record<string, string>) => {
      if (!isRunAwaitingDesignApproval(run)) return;
      setActiveStep("preview");
      try {
        await resumeRun.mutateAsync({
          formData: { designApproved: true, plan, imageUploads: uploads },
        });
        invalidateCarouselQueries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Erro ao aprovar design",
        );
      }
    },
    [run, resumeRun, invalidateCarouselQueries],
  );

  const updateDesign = useCallback(
    (_plan: CarouselDesignPlan, _uploads: Record<string, string>) => {
      // Review-only; persisted on approve.
    },
    [],
  );

  const rejectDesign = useCallback(async () => {
    if (!isRunAwaitingDesignApproval(run)) return;
    setActiveStep("design");
    try {
      await resumeRun.mutateAsync({ formData: { designApproved: false } });
      invalidateCarouselQueries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao regenerar design",
      );
    }
  }, [run, resumeRun, invalidateCarouselQueries]);

  const requestExport = useCallback(async () => {
    if (!runId || isExporting) return;
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const { data } = await apiClient.get<Blob>(
        `/agents/carousel/runs/${runId}/export`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(data);
      setExportDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao exportar carrossel",
      );
    } finally {
      setIsExporting(false);
    }
  }, [runId, isExporting]);

  useEffect(
    () => () => {
      if (exportDownloadUrl) URL.revokeObjectURL(exportDownloadUrl);
    },
    [exportDownloadUrl],
  );

  const canGoPrev = useMemo(() => {
    const currentIndex = getCarouselStepIndex(activeStep);
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const stepId = CAROUSEL_RUN_STEPS[index]?.id;
      if (stepId && isCarouselStepAccessible(stepId, phases)) return true;
    }
    return false;
  }, [activeStep, phases]);

  const canGoNext = useMemo(() => {
    const currentStatus = getCarouselStepPhaseStatus(activeStep, phases);
    if (currentStatus !== "completed") return false;

    const currentIndex = getCarouselStepIndex(activeStep);
    for (
      let index = currentIndex + 1;
      index < CAROUSEL_RUN_STEPS.length;
      index += 1
    ) {
      const stepId = CAROUSEL_RUN_STEPS[index]?.id;
      if (stepId && isCarouselStepAccessible(stepId, phases)) return true;
    }
    return false;
  }, [activeStep, phases]);

  return {
    runData,
    run,
    isLoading,
    isError,
    errorMessage,
    phaseErrors,
    clearErrorMessage,
    ideas: {
      status: phases.ideas.status,
      data: ideasData,
      selectedId: selectedIdeaId,
    },
    content: {
      status: phases.content.status,
      data: contentData,
    },
    design: {
      status: phases.design.status,
      data: designPlan,
      imageUploads,
    },
    preview: {
      status: phases.preview.status,
      data: output,
      isExporting,
      exportDownloadUrl,
    },
    activeStep,
    phases,
    navigation: {
      goToStep,
      goToAdjacentStep,
      canGoPrev,
      canGoNext,
    },
    actions: {
      selectIdea,
      updateIdeaSelection,
      approveContent,
      updateContent,
      rejectContent,
      setImageUpload,
      approveDesign,
      updateDesign,
      rejectDesign,
      requestExport,
    },
  };
};
