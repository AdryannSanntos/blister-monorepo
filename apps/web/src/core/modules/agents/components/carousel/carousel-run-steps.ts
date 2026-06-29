export type CarouselPhaseStatus =
  | "idle"
  | "processing"
  | "awaiting_action"
  | "completed"
  | "error";

export type CarouselRunStepId = "ideas" | "content" | "design" | "preview";

export const CAROUSEL_RUN_STEPS: {
  id: CarouselRunStepId;
  label: string;
}[] = [
  { id: "ideas", label: "Ideia" },
  { id: "content", label: "Conteúdo" },
  { id: "design", label: "Design" },
  { id: "preview", label: "Preview" },
];

export type CarouselRunPhaseSnapshot = {
  ideas: { status: CarouselPhaseStatus };
  content: { status: CarouselPhaseStatus };
  design: { status: CarouselPhaseStatus };
  preview: { status: CarouselPhaseStatus };
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
