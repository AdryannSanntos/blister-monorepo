import type { AgentRunStatusDto } from "@company-os/types";

export type PostOnboardingField = {
  name: string;
  kind: "single" | "text";
  label: string;
  options?: Array<{ id: string; label: string; description?: string }>;
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

const FORMAT_LABELS: Record<string, string> = {
  single: "Imagem única",
  carousel: "Carrossel (vários slides)",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  sell: "Vender ou divulgar um produto/serviço",
  engage: "Engajar e educar a audiência",
  promo: "Anunciar uma promoção ou oferta",
  awareness: "Apresentar e fortalecer a marca",
};

const FIELD_SOCIAL_NETWORK: PostOnboardingField = {
  name: "socialNetwork",
  kind: "single",
  label: "Para qual rede social é o post?",
  options: Object.entries(PLATFORM_LABELS).map(([id, label]) => ({ id, label })),
};

const FIELD_POST_FORMAT: PostOnboardingField = {
  name: "postFormat",
  kind: "single",
  label: "Qual o formato do post?",
  options: Object.entries(FORMAT_LABELS).map(([id, label]) => ({ id, label })),
};

const FIELD_SLIDES_COUNT: PostOnboardingField = {
  name: "slidesCount",
  kind: "single",
  label: "Quantos slides terá o carrossel?",
  options: ["2", "3", "4", "5", "6", "7", "8"].map((value) => ({
    id: value,
    label: `${value} slides`,
  })),
};

const FIELD_OBJECTIVE: PostOnboardingField = {
  name: "objective",
  kind: "single",
  label: "Qual o objetivo principal deste post?",
  options: Object.entries(OBJECTIVE_LABELS).map(([id, label]) => ({ id, label })),
};

const readString = (answers: Record<string, unknown>, name: string): string => {
  const value = answers[name];
  return typeof value === "string" ? value.trim() : "";
};

const isAnswered = (answers: Record<string, unknown>, name: string): boolean => {
  const value = answers[name];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

/** Mirrors backend `getNextOnboardingField` field order for the current brief. */
export const getApplicablePostOnboardingFields = (
  inputPayload: Record<string, unknown>,
): PostOnboardingField[] => {
  const fields: PostOnboardingField[] = [
    FIELD_SOCIAL_NETWORK,
    FIELD_POST_FORMAT,
  ];

  if (readString(inputPayload, "postFormat") === "carousel") {
    fields.push(FIELD_SLIDES_COUNT);
  }

  fields.push(FIELD_OBJECTIVE);
  return fields;
};

export const getAnsweredPostOnboardingFields = (
  inputPayload: Record<string, unknown>,
): Array<{ field: PostOnboardingField; value: string }> =>
  getApplicablePostOnboardingFields(inputPayload)
    .filter((field) => isAnswered(inputPayload, field.name))
    .map((field) => ({
      field,
      value: readString(inputPayload, field.name),
    }));

export const getPendingPostOnboardingField = (
  run: AgentRunStatusDto,
): PostOnboardingField | null => {
  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  const applicable = getApplicablePostOnboardingFields(inputPayload);
  const pending = applicable.find((field) => !isAnswered(inputPayload, field.name));
  return pending ?? null;
};

export const isPostOnboardingInProgress = (run: AgentRunStatusDto): boolean => {
  if (run.status === "PAUSED" && run.currentStepKey === "collect_brief") {
    return true;
  }

  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  const hasOnboardingAnswers = getAnsweredPostOnboardingFields(inputPayload).length > 0;
  const onboardingIncomplete = getPendingPostOnboardingField(run) !== null;

  return hasOnboardingAnswers && onboardingIncomplete;
};

export const formatPostOnboardingAnswer = (
  field: PostOnboardingField,
  value: string,
): string => {
  const option = field.options?.find((entry) => entry.id === value);
  if (option) return option.label;

  if (field.name === "socialNetwork") {
    return PLATFORM_LABELS[value] ?? value;
  }
  if (field.name === "postFormat") {
    return FORMAT_LABELS[value] ?? value;
  }
  if (field.name === "objective") {
    return OBJECTIVE_LABELS[value] ?? value;
  }

  return value;
};

export const fieldFromPauseSchema = (
  run: AgentRunStatusDto,
): PostOnboardingField | null => {
  const schema = run.pauseFormSchema as {
    fields?: Array<{
      name: string;
      label: string;
      kind?: "single" | "multi" | "text";
      options?: Array<{ id: string; label: string; description?: string }>;
    }>;
  } | null;

  const field = schema?.fields?.[0];
  if (!field) return null;

  return {
    name: field.name,
    kind: field.kind === "text" ? "text" : "single",
    label: field.label,
    options: field.options,
  };
};
