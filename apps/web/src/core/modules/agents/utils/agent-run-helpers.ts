import type {
  AgentRunStatus,
  AgentRunStatusDto,
  ReviewStatus,
} from "@company-os/types";

import type { AgentUiId } from "../config/agent-ui-config";

export type StrategistOutput = {
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
  variations?: Array<{ caption: string; tone: string }>;
  callToAction?: string;
};

export type DesignerOutput = {
  imageStorageKey?: string;
  prompt?: string;
  format?: string;
  width?: number;
  height?: number;
};

export type PostOutput = CopywriterOutput &
  DesignerOutput & {
    imagePrompt?: string;
  };

export function parseStrategistOutput(
  payload: Record<string, unknown>,
): StrategistOutput {
  return {
    plan: typeof payload.plan === "string" ? payload.plan : undefined,
    angles: Array.isArray(payload.angles)
      ? payload.angles.filter((item): item is string => typeof item === "string")
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

export function parseCopywriterOutput(
  payload: Record<string, unknown>,
): CopywriterOutput {
  return {
    caption: typeof payload.caption === "string" ? payload.caption : undefined,
    hashtags: Array.isArray(payload.hashtags)
      ? payload.hashtags.filter((item): item is string => typeof item === "string")
      : undefined,
    variations: Array.isArray(payload.variations)
      ? payload.variations.filter(
          (item): item is { caption: string; tone: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { caption?: unknown }).caption === "string" &&
            typeof (item as { tone?: unknown }).tone === "string",
        )
      : undefined,
    callToAction:
      typeof payload.callToAction === "string" ? payload.callToAction : undefined,
  };
}

export function parseDesignerOutput(
  payload: Record<string, unknown>,
): DesignerOutput {
  return {
    imageStorageKey:
      typeof payload.imageStorageKey === "string"
        ? payload.imageStorageKey
        : undefined,
    prompt: typeof payload.prompt === "string" ? payload.prompt : undefined,
    format: typeof payload.format === "string" ? payload.format : undefined,
    width: typeof payload.width === "number" ? payload.width : undefined,
    height: typeof payload.height === "number" ? payload.height : undefined,
  };
}

export function parsePostOutput(payload: Record<string, unknown>): PostOutput {
  return {
    ...parseCopywriterOutput(payload),
    ...parseDesignerOutput(payload),
    imagePrompt:
      typeof payload.imagePrompt === "string" ? payload.imagePrompt : undefined,
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
  return (
    run.status === "COMPLETED" &&
    (run.reviewStatus === "PENDING_REVIEW" ||
      run.reviewStatus === "EDITED" ||
      run.reviewStatus === null)
  );
}

export function getReviewStatusLabelKey(
  status: ReviewStatus | null,
): "reviewPending" | "reviewApproved" | "reviewRejected" | "reviewEdited" | null {
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
      return output.caption?.slice(0, 120) ?? output.imagePrompt?.slice(0, 120) ?? "";
    }
    default:
      return "";
  }
}
