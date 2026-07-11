import type {
  AgentRunStatusDto,
  AgentRunStepDto,
  CarouselIdeaOption,
  CarouselOutput,
  CarouselOutputSlide,
  CarouselSlideContent,
} from "@company-os/types";

import type {
  CarouselPhaseStatus,
  CarouselRunPhaseSnapshot,
  CarouselRunStepId,
} from "../components/carousel/carousel-run-steps";

export const AWAITING_IDEA_SELECTION = "awaiting_idea_selection";
export const AWAITING_CONTENT_APPROVAL = "awaiting_content_approval";

const IDEAS_STEPS = ["generate_ideas", "await_idea_selection"] as const;
const EDITOR_STEPS = [
  "generate_content",
  "await_content_approval",
  "generate_slides",
  "render_slides",
  "finalize_carousel",
] as const;

const PHASE_STEPS: Record<CarouselRunStepId, readonly string[]> = {
  ideas: IDEAS_STEPS,
  editor: EDITOR_STEPS,
};

export const getRunTheme = (
  inputPayload: Record<string, unknown>,
): string => {
  const theme = inputPayload.theme;
  if (typeof theme === "string" && theme.trim().length > 0) return theme.trim();

  const userInput = inputPayload.userInput;
  return typeof userInput === "string" && userInput.trim().length > 0
    ? userInput.trim()
    : "—";
};

export const readSelectedIdeaId = (
  inputPayload: Record<string, unknown>,
): string | null => {
  const selected = inputPayload.selectedIdeaId;
  return typeof selected === "string" && selected.length > 0 ? selected : null;
};

const readStep = (
  steps: AgentRunStepDto[] | undefined,
  stepKey: string,
): AgentRunStepDto | undefined => steps?.find((step) => step.stepKey === stepKey);

const isStepCompleted = (step: AgentRunStepDto | undefined): boolean =>
  step?.status === "COMPLETED";

const isStepRunning = (step: AgentRunStepDto | undefined): boolean =>
  step?.status === "RUNNING";

const isStepFailed = (step: AgentRunStepDto | undefined): boolean =>
  step?.status === "FAILED";

export const extractPhaseErrorMessage = (params: {
  phase: CarouselRunStepId;
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): string | null => {
  const { phase, run, steps } = params;
  if (run.status !== "FAILED") return null;

  const phaseSteps = PHASE_STEPS[phase];
  const failedStep = phaseSteps
    .map((key) => readStep(steps, key))
    .find((step) => isStepFailed(step));

  if (failedStep?.errorMessage?.trim()) return failedStep.errorMessage.trim();
  if (run.currentStepKey && phaseSteps.includes(run.currentStepKey) && run.errorMessage?.trim()) {
    return run.errorMessage.trim();
  }

  const touched = phaseSteps.some(
    (key) =>
      isStepCompleted(readStep(steps, key)) ||
      isStepRunning(readStep(steps, key)) ||
      isStepFailed(readStep(steps, key)) ||
      run.currentStepKey === key,
  );

  return touched && run.errorMessage?.trim() ? run.errorMessage.trim() : null;
};

const readIdeasFromPayload = (payload: unknown): CarouselIdeaOption[] => {
  if (!payload || typeof payload !== "object") return [];
  const ideas = (payload as { ideas?: unknown }).ideas;
  if (!Array.isArray(ideas)) return [];
  return ideas as CarouselIdeaOption[];
};

export const extractIdeasFromRun = (params: {
  steps?: AgentRunStepDto[];
}): CarouselIdeaOption[] =>
  readIdeasFromPayload(readStep(params.steps, "generate_ideas")?.outputPayload);

const readSlidesFromPayload = (payload: unknown): CarouselSlideContent[] => {
  if (!payload || typeof payload !== "object") return [];
  const slides = (payload as { slides?: unknown }).slides;
  if (!Array.isArray(slides)) return [];
  return slides as CarouselSlideContent[];
};

export const extractSlideContentsFromRun = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CarouselSlideContent[] => {
  const fromInput = readSlidesFromPayload(params.run.inputPayload);
  if (fromInput.length > 0) return fromInput;

  const contentStep = readStep(params.steps, "generate_content");
  return readSlidesFromPayload(contentStep?.outputPayload);
};

export const readImageUploads = (
  inputPayload: Record<string, unknown>,
): Record<string, string> => {
  const uploads = inputPayload.imageUploads;
  if (!uploads || typeof uploads !== "object" || uploads === null) return {};
  return uploads as Record<string, string>;
};

export const dedupeCarouselSlidesById = <T extends CarouselOutputSlide>(
  slides: T[],
): T[] => {
  const byId = new Map<string, T>();

  for (const slide of slides) {
    const existing = byId.get(slide.id);
    if (!existing || slide.order < existing.order) {
      byId.set(slide.id, slide);
    }
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
};

export const normalizeCarouselOutput = (
  output: CarouselOutput,
): CarouselOutput => ({
  ...output,
  slides: dedupeCarouselSlidesById(output.slides),
});

export const getCarouselSlideReactKey = (
  slide: CarouselOutputSlide,
  index: number,
): string => `${slide.id}::${slide.order}::${index}`;

const readOutputFromPayload = (payload: unknown): CarouselOutput | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.slides) && typeof record.templateId === "string") {
    return normalizeCarouselOutput(record as CarouselOutput);
  }
  return null;
};

export const extractCarouselOutputFromRun = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CarouselOutput | null => {
  const fromOutput = readOutputFromPayload(params.run.outputPayload);
  if (fromOutput) return fromOutput;

  const finalizeStep = readStep(params.steps, "finalize_carousel");
  return readOutputFromPayload(finalizeStep?.outputPayload);
};

export const isRunAwaitingIdeaSelection = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason"> | null | undefined,
): boolean =>
  run?.status === "PAUSED" && run.pauseReason === AWAITING_IDEA_SELECTION;

export const isRunAwaitingContentApproval = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason"> | null | undefined,
): boolean =>
  run?.status === "PAUSED" && run.pauseReason === AWAITING_CONTENT_APPROVAL;

const isPhaseGateCompleted = (
  phase: CarouselRunStepId,
  steps: AgentRunStepDto[] | undefined,
): boolean => {
  const phaseSteps = PHASE_STEPS[phase];
  const gateStepKey = phaseSteps[phaseSteps.length - 1];
  return isStepCompleted(readStep(steps, gateStepKey));
};

const isPhaseProcessing = (
  phase: CarouselRunStepId,
  run: AgentRunStatusDto,
  steps: AgentRunStepDto[] | undefined,
): boolean => {
  if (run.status === "FAILED" || run.status === "CANCELLED") return false;

  const phaseSteps = PHASE_STEPS[phase];
  const currentKey = run.currentStepKey;

  if (currentKey && phaseSteps.includes(currentKey)) {
    if (run.status === "RUNNING" || run.status === "QUEUED") return true;
  }

  return phaseSteps.some((key) => isStepRunning(readStep(steps, key)));
};

const derivePhaseStatus = (
  phase: CarouselRunStepId,
  run: AgentRunStatusDto,
  steps: AgentRunStepDto[] | undefined,
  priorPhasesCompleted: boolean,
): CarouselPhaseStatus => {
  if (run.status === "FAILED") {
    const phaseSteps = PHASE_STEPS[phase];
    const touched = phaseSteps.some(
      (key) =>
        isStepCompleted(readStep(steps, key)) ||
        isStepRunning(readStep(steps, key)) ||
        run.currentStepKey === key,
    );
    return touched ? "error" : "idle";
  }

  if (phase === "editor" && run.status === "COMPLETED") {
    return "completed";
  }

  if (!priorPhasesCompleted) return "idle";

  if (phase === "ideas" && isRunAwaitingIdeaSelection(run)) {
    return "awaiting_action";
  }

  if (phase === "editor" && isRunAwaitingContentApproval(run)) {
    return "awaiting_action";
  }

  if (isPhaseGateCompleted(phase, steps)) {
    return "completed";
  }

  if (isPhaseProcessing(phase, run, steps)) {
    return "processing";
  }

  return "idle";
};

export const deriveCarouselPhases = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CarouselRunPhaseSnapshot => {
  const { run, steps } = params;
  const ideasCompleted = isPhaseGateCompleted("ideas", steps);

  return {
    ideas: { status: derivePhaseStatus("ideas", run, steps, true) },
    editor: { status: derivePhaseStatus("editor", run, steps, ideasCompleted) },
  };
};

export const resolvePausePhase = (
  pauseReason: string | null | undefined,
): CarouselRunStepId | null => {
  switch (pauseReason) {
    case AWAITING_IDEA_SELECTION:
      return "ideas";
    case AWAITING_CONTENT_APPROVAL:
      return "editor";
    default:
      return null;
  }
};

export const resolveActiveCarouselStep = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CarouselRunStepId => {
  const pausePhase = resolvePausePhase(params.run.pauseReason);
  if (params.run.status === "PAUSED" && pausePhase) return pausePhase;

  const phases = deriveCarouselPhases(params);
  const order: CarouselRunStepId[] = ["ideas", "editor"];

  if (params.run.status === "FAILED") {
    for (const stepId of order) {
      if (phases[stepId].status === "error") return stepId;
    }
  }

  for (const stepId of order) {
    const status = phases[stepId].status;
    if (
      status === "awaiting_action" ||
      status === "processing" ||
      status === "error" ||
      (status === "completed" && stepId === "editor")
    ) {
      return stepId;
    }
  }

  for (const stepId of [...order].reverse()) {
    if (phases[stepId].status !== "idle") return stepId;
  }

  return "ideas";
};

export const isCarouselRunActive = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason"> | null | undefined,
): boolean => {
  if (!run) return false;
  if (run.status === "QUEUED" || run.status === "RUNNING") return true;
  if (run.status === "PAUSED") {
    return isRunAwaitingIdeaSelection(run) || isRunAwaitingContentApproval(run);
  }
  return false;
};

export const getFirstCarouselSlideFromRun = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CarouselOutputSlide | null => {
  if (params.run.status !== "COMPLETED") return null;

  const output = extractCarouselOutputFromRun(params);
  if (!output?.slides.length) return null;

  return [...output.slides].sort((a, b) => a.order - b.order)[0] ?? null;
};

export type CarouselViewableRun = AgentRunStatusDto & {
  theme: string;
  templateId: string;
  slidesCount: number;
  firstSlide: CarouselOutputSlide | null;
};

export const toCarouselViewableRun = (
  run: AgentRunStatusDto,
): CarouselViewableRun => {
  const input = run.inputPayload;
  const templateId =
    typeof input.templateId === "string" ? input.templateId : "—";
  const slidesCount =
    typeof input.slidesCount === "number" ? input.slidesCount : 0;

  return {
    ...run,
    theme: getRunTheme(input),
    templateId,
    slidesCount,
    firstSlide: getFirstCarouselSlideFromRun({ run }),
  };
};

export const isCarouselProcessingRun = (
  run: Pick<AgentRunStatusDto, "status">,
): boolean => run.status === "QUEUED" || run.status === "RUNNING";
