import type {
  AgentRunStatus,
  AgentRunStatusDto,
  ReviewStatus,
} from "@company-os/types";

import type { AgentUiId } from "../config/agent-ui-config";

export type StrategistTopic = {
  title: string;
  description: string;
  suggestedDate?: string;
  platform?: string;
  priority?: "high" | "medium" | "low";
};

export type StrategistCalendar = {
  weeklyPosts: number;
  bestTimes: string[];
  platforms?: string[];
};

export type StrategistOutput = {
  topics?: StrategistTopic[];
  calendar?: StrategistCalendar;
  recommendations?: string;
  plan?: string;
  angles?: string[];
  suggestedCalendar?: Array<{
    date: string;
    topic: string;
    format: string;
  }>;
  summary?: string;
};

export type CopywriterOutput = {
  caption?: string;
  hashtags?: string[];
  tone?: string;
  variations?: Array<{ caption: string; tone: string }>;
  callToAction?: string;
};

export type DesignerOutput = {
  imageUrl?: string;
  imageStorageKey?: string;
  storageKey?: string;
  prompt?: string;
  imagePrompt?: string;
  style?: string;
  colors?: string[];
  format?: string;
  width?: number;
  height?: number;
};

export type PostSlide = {
  html: string;
};

export type PostOutput = CopywriterOutput & {
  platform?: string;
  format?: string;
  width?: number;
  height?: number;
  slidesCount?: number;
  slides?: PostSlide[];
};

export function parsePostSlides(payload: Record<string, unknown>): PostSlide[] {
  if (!Array.isArray(payload.slides)) return [];
  return payload.slides.flatMap((slide) => {
    const html = (slide as { html?: unknown })?.html;
    return typeof html === "string" && html.trim().length > 0 ? [{ html }] : [];
  });
}

export function normalizeReviewStatus(
  status: string | null | undefined,
): ReviewStatus | null {
  if (!status) return null;
  if (status === "PENDING") return "PENDING_REVIEW";
  if (
    status === "PENDING_REVIEW" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "EDITED"
  ) {
    return status;
  }
  return null;
}

export function parseStrategistOutput(
  payload: Record<string, unknown>,
): StrategistOutput {
  const topics = Array.isArray(payload.topics)
    ? payload.topics.filter(
        (item): item is StrategistTopic =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { title?: unknown }).title === "string" &&
          typeof (item as { description?: unknown }).description === "string",
      )
    : undefined;

  const calendar =
    typeof payload.calendar === "object" && payload.calendar !== null
      ? (payload.calendar as StrategistCalendar)
      : undefined;

  return {
    topics,
    calendar,
    recommendations:
      typeof payload.recommendations === "string"
        ? payload.recommendations
        : undefined,
    plan: typeof payload.plan === "string" ? payload.plan : undefined,
    angles: Array.isArray(payload.angles)
      ? payload.angles.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    suggestedCalendar: Array.isArray(payload.suggestedCalendar)
      ? payload.suggestedCalendar.filter(
          (item): item is { date: string; topic: string; format: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { topic?: unknown }).topic === "string" &&
            typeof (item as { format?: unknown }).format === "string",
        )
      : undefined,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
  };
}

function firstString(
  payload: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    if (typeof payload[key] === "string" && payload[key]) {
      return payload[key] as string;
    }
  }
  return undefined;
}

export function parseCopywriterOutput(
  payload: Record<string, unknown>,
): CopywriterOutput {
  return {
    // Models occasionally emit `copy`/`text`/`legenda` or `cta` instead of the
    // schema names — accept those aliases so the result always renders.
    caption: firstString(payload, ["caption", "copy", "text", "legenda"]),
    hashtags: Array.isArray(payload.hashtags)
      ? payload.hashtags.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    tone: firstString(payload, ["tone", "tom"]),
    variations: Array.isArray(payload.variations)
      ? payload.variations.filter(
          (item): item is { caption: string; tone: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { caption?: unknown }).caption === "string" &&
            typeof (item as { tone?: unknown }).tone === "string",
        )
      : undefined,
    callToAction: firstString(payload, [
      "callToAction",
      "cta",
      "call_to_action",
    ]),
  };
}

export function parseDesignerOutput(
  payload: Record<string, unknown>,
): DesignerOutput {
  const imageUrl =
    typeof payload.imageUrl === "string" ? payload.imageUrl : undefined;
  const storageKey =
    typeof payload.storageKey === "string" ? payload.storageKey : undefined;

  return {
    imageUrl,
    imageStorageKey:
      typeof payload.imageStorageKey === "string"
        ? payload.imageStorageKey
        : storageKey,
    storageKey,
    prompt:
      typeof payload.prompt === "string"
        ? payload.prompt
        : typeof payload.imagePrompt === "string"
          ? payload.imagePrompt
          : undefined,
    imagePrompt:
      typeof payload.imagePrompt === "string" ? payload.imagePrompt : undefined,
    style: typeof payload.style === "string" ? payload.style : undefined,
    colors: Array.isArray(payload.colors)
      ? payload.colors.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    format: typeof payload.format === "string" ? payload.format : undefined,
    width: typeof payload.width === "number" ? payload.width : undefined,
    height: typeof payload.height === "number" ? payload.height : undefined,
  };
}

export function parsePostOutput(payload: Record<string, unknown>): PostOutput {
  return {
    ...parseCopywriterOutput(payload),
    platform:
      typeof payload.platform === "string" ? payload.platform : undefined,
    format: typeof payload.format === "string" ? payload.format : undefined,
    width: typeof payload.width === "number" ? payload.width : undefined,
    height: typeof payload.height === "number" ? payload.height : undefined,
    slidesCount:
      typeof payload.slidesCount === "number" ? payload.slidesCount : undefined,
    slides: parsePostSlides(payload),
  };
}

export function getRunUserInput(run: AgentRunStatusDto): string {
  const input = run.inputPayload.userInput;
  return typeof input === "string" ? input : "";
}

export function isRunActive(status: AgentRunStatus): boolean {
  return status === "QUEUED" || status === "RUNNING" || status === "PAUSED";
}

export function canReviewRun(run: AgentRunStatusDto): boolean {
  const reviewStatus =
    normalizeReviewStatus(run.reviewStatus) ??
    normalizeReviewStatus(
      typeof run.outputPayload.reviewStatus === "string"
        ? run.outputPayload.reviewStatus
        : null,
    );

  return (
    run.status === "COMPLETED" &&
    (reviewStatus === "PENDING_REVIEW" ||
      reviewStatus === "EDITED" ||
      reviewStatus === null)
  );
}

export function getReviewStatusLabelKey(
  status: ReviewStatus | null,
):
  | "reviewPending"
  | "reviewApproved"
  | "reviewRejected"
  | "reviewEdited"
  | null {
  switch (status) {
    case "PENDING_REVIEW":
      return "reviewPending";
    case "APPROVED":
      return "reviewApproved";
    case "REJECTED":
      return "reviewRejected";
    case "EDITED":
      return "reviewEdited";
    default:
      return null;
  }
}

export function getAgentOutputPreview(
  agentId: AgentUiId,
  payload: Record<string, unknown>,
): string {
  switch (agentId) {
    case "strategist": {
      const output = parseStrategistOutput(payload);
      if (output.recommendations) {
        return output.recommendations.slice(0, 120);
      }
      const firstTopic = output.topics?.[0];
      if (firstTopic) {
        return `${firstTopic.title}: ${firstTopic.description}`.slice(0, 120);
      }
      return output.summary ?? output.plan?.slice(0, 120) ?? "";
    }
    case "copywriter": {
      const output = parseCopywriterOutput(payload);
      return output.caption?.slice(0, 120) ?? "";
    }
    case "designer": {
      const output = parseDesignerOutput(payload);
      return output.prompt?.slice(0, 120) ?? "";
    }
    case "post": {
      const output = parsePostOutput(payload);
      if (output.caption) return output.caption.slice(0, 120);
      if (output.slides?.length) {
        return `${output.platform ?? "Post"} · ${output.slides.length} slide(s)`;
      }
      return "";
    }
    default:
      return "";
  }
}
