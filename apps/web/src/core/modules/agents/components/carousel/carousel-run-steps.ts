export type CarouselPhaseStatus =
  | "idle"
  | "processing"
  | "awaiting_action"
  | "completed"
  | "error";

export type CarouselRunStepId = "ideas" | "editor";

export const CAROUSEL_RUN_STEPS: {
  id: CarouselRunStepId;
  label: string;
}[] = [
  { id: "ideas", label: "Ideia" },
  { id: "editor", label: "Editor" },
];

export type CarouselRunPhaseSnapshot = {
  ideas: { status: CarouselPhaseStatus };
  editor: { status: CarouselPhaseStatus };
};

export const getCarouselStepPhaseStatus = (
  stepId: CarouselRunStepId,
  phases: CarouselRunPhaseSnapshot,
): CarouselPhaseStatus => phases[stepId].status;

export const isCarouselStepAccessible = (
  stepId: CarouselRunStepId,
  phases: CarouselRunPhaseSnapshot,
): boolean => {
  const status = getCarouselStepPhaseStatus(stepId, phases);
  return status !== "idle";
};

export const getCarouselStepIndex = (stepId: CarouselRunStepId) =>
  CAROUSEL_RUN_STEPS.findIndex((step) => step.id === stepId);
