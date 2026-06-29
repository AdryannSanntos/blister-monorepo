import type {
  CarouselNarrativeRole,
  CarouselSlideContent,
  CarouselSlideType,
} from "@company-os/types";

export type CarouselContentFieldKey =
  | "title"
  | "subtitle"
  | "body"
  | "listItems"
  | "callToAction"
  | "ctaKeyword"
  | "ctaHint"
  | "imageBrief";

export type CarouselContentFieldDefinition = {
  key: CarouselContentFieldKey;
  labelKey: string;
  placementKey: string;
  optional?: boolean;
};

const inferNarrativeRole = (slide: CarouselSlideContent): CarouselNarrativeRole => {
  if (slide.narrativeRole) return slide.narrativeRole;
  if (slide.order === 1 || slide.type === "start") return "hook";
  if (slide.ctaKeyword) return "cta";
  if ((slide.listItems?.length ?? 0) >= 3) return "framework";
  if (slide.type === "text_image" || slide.imageBrief) return "scene";
  return "scene";
};

const ROLE_FIELDS: Record<CarouselNarrativeRole, CarouselContentFieldDefinition[]> = {
  hook: [
    { key: "title", labelKey: "fields.title", placementKey: "placement.hookTitle" },
    { key: "subtitle", labelKey: "fields.subtitle", placementKey: "placement.hookSubtitle" },
    {
      key: "imageBrief",
      labelKey: "fields.coverImage",
      placementKey: "placement.coverImage",
      optional: true,
    },
  ],
  scene: [
    { key: "title", labelKey: "fields.title", placementKey: "placement.sceneTitle" },
    { key: "body", labelKey: "fields.body", placementKey: "placement.sceneBody", optional: true },
    {
      key: "listItems",
      labelKey: "fields.listItems",
      placementKey: "placement.sceneList",
      optional: true,
    },
    {
      key: "callToAction",
      labelKey: "fields.closing",
      placementKey: "placement.sceneClosing",
      optional: true,
    },
    {
      key: "imageBrief",
      labelKey: "fields.image",
      placementKey: "placement.sceneImage",
      optional: true,
    },
  ],
  proof: [
    { key: "title", labelKey: "fields.title", placementKey: "placement.proofTitle" },
    { key: "body", labelKey: "fields.body", placementKey: "placement.proofBody", optional: true },
    {
      key: "listItems",
      labelKey: "fields.checklist",
      placementKey: "placement.proofChecklist",
      optional: true,
    },
    {
      key: "callToAction",
      labelKey: "fields.closing",
      placementKey: "placement.proofClosing",
      optional: true,
    },
    {
      key: "imageBrief",
      labelKey: "fields.proofImage",
      placementKey: "placement.proofImage",
      optional: true,
    },
  ],
  framework: [
    { key: "title", labelKey: "fields.title", placementKey: "placement.frameworkTitle" },
    {
      key: "listItems",
      labelKey: "fields.frameworkItems",
      placementKey: "placement.frameworkList",
    },
    {
      key: "callToAction",
      labelKey: "fields.closing",
      placementKey: "placement.frameworkClosing",
      optional: true,
    },
  ],
  cta: [
    { key: "body", labelKey: "fields.ctaLead", placementKey: "placement.ctaLead", optional: true },
    {
      key: "ctaHint",
      labelKey: "fields.ctaHint",
      placementKey: "placement.ctaHint",
      optional: true,
    },
    { key: "ctaKeyword", labelKey: "fields.ctaKeyword", placementKey: "placement.ctaKeyword" },
    {
      key: "callToAction",
      labelKey: "fields.ctaAction",
      placementKey: "placement.ctaAction",
      optional: true,
    },
  ],
};

export const NARRATIVE_ROLE_LABEL_KEYS: Record<CarouselNarrativeRole, string> = {
  hook: "roles.hook",
  scene: "roles.scene",
  proof: "roles.proof",
  framework: "roles.framework",
  cta: "roles.cta",
};

export const SLIDE_TYPE_HINT_KEYS: Record<CarouselSlideType, string> = {
  start: "typeHints.start",
  text: "typeHints.text",
  text_image: "typeHints.textImage",
  image: "typeHints.image",
};

export const getSlideNarrativeRole = (slide: CarouselSlideContent): CarouselNarrativeRole =>
  inferNarrativeRole(slide);

export const getContentFieldsForSlide = (
  slide: CarouselSlideContent,
): CarouselContentFieldDefinition[] => ROLE_FIELDS[inferNarrativeRole(slide)];

export const getSlideFieldValue = (
  slide: CarouselSlideContent,
  key: CarouselContentFieldKey,
): string | string[] | undefined => {
  if (key === "listItems") return slide.listItems;
  return slide[key];
};

export const hasSlideFieldValue = (
  slide: CarouselSlideContent,
  key: CarouselContentFieldKey,
): boolean => {
  const value = getSlideFieldValue(slide, key);
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return Boolean(value?.trim());
};

export const parseListItemsFromText = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const formatListItemsForTextarea = (items: string[] | undefined): string =>
  items?.join("\n") ?? "";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Preview ==accent== and **bold** markers in the content review step. */
export const formatCarouselCopyPreviewHtml = (value: string): string => {
  let result = escapeHtml(value);
  result = result.replace(/==([^=\n]+?)==/g, '<span class="text-[var(--accent)] font-semibold">$1</span>');
  result = result.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  return result;
};
