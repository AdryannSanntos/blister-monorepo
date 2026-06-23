import type {
  AgentRunStatusDto,
  AgentRunStepDto,
  CutOutput,
  CutsTranscriptSegment,
} from "@company-os/types";

import { withStableCutIds } from "./cuts-display";

export const readSourceFileId = (
  inputPayload: Record<string, unknown>,
): string | null => {
  const direct = inputPayload.sourceFileId;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const metadata = inputPayload.metadata;
  if (metadata && typeof metadata === "object" && metadata !== null) {
    const nested = (metadata as Record<string, unknown>).sourceFileId;
    if (typeof nested === "string" && nested.length > 0) return nested;
  }

  return null;
};

export const getRunSourceTitle = (
  inputPayload: Record<string, unknown>,
): string => {
  const userInput = inputPayload.userInput;
  return typeof userInput === "string" && userInput.trim().length > 0
    ? userInput.trim()
    : "—";
};

const readCutsFromPayload = (payload: unknown): CutOutput[] => {
  if (!payload || typeof payload !== "object") return [];
  const cuts = (payload as { cuts?: unknown }).cuts;
  if (!Array.isArray(cuts) || cuts.length === 0) return [];
  return withStableCutIds(cuts as CutOutput[]);
};

const readCutsFromStep = (
  steps: AgentRunStepDto[] | undefined,
  stepKey: string,
): CutOutput[] => {
  const step = steps?.find((item) => item.stepKey === stepKey);
  return readCutsFromPayload(step?.outputPayload);
};

/** Reads cuts from run output, dispatch_renders step, or rank step (while paused). */
export const extractCutsFromRun = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): CutOutput[] => {
  const fromOutput = readCutsFromPayload(params.run.outputPayload);
  if (fromOutput.length > 0) return fromOutput;

  const fromDispatch = readCutsFromStep(params.steps, "dispatch_renders");
  if (fromDispatch.length > 0) return fromDispatch;

  return readCutsFromStep(params.steps, "rank_segments");
};

export const extractCutsFromRunDto = (run: AgentRunStatusDto): CutOutput[] =>
  extractCutsFromRun({ run });

const isTimedSegment = (value: unknown): value is CutsTranscriptSegment => {
  if (!value || typeof value !== "object") return false;
  const segment = value as Record<string, unknown>;
  return (
    typeof segment.startSec === "number" &&
    typeof segment.endSec === "number" &&
    typeof segment.text === "string"
  );
};

/**
 * Reads the timed transcript (speaker, timestamps, text) the cuts agent emits
 * from its `resolve_source` step. Prefers `analyzedSegments` (carry id +
 * speaker), falling back to raw `segments`. Times are relative to the source.
 */
export const extractTranscriptFromRun = (params: {
  steps?: AgentRunStepDto[];
}): CutsTranscriptSegment[] => {
  const step = params.steps?.find((item) => item.stepKey === "resolve_source");
  if (!step) return [];

  const payload = step.outputPayload as {
    analyzedSegments?: unknown;
    segments?: unknown;
  };

  const source = Array.isArray(payload.analyzedSegments)
    ? payload.analyzedSegments
    : Array.isArray(payload.segments)
      ? payload.segments
      : [];

  return source.filter(isTimedSegment).map((segment, index) => ({
    id: segment.id ?? `seg-${index + 1}`,
    startSec: segment.startSec,
    endSec: segment.endSec,
    text: segment.text.trim(),
    speaker: segment.speaker,
    words: segment.words,
  }));
};

/** Fingerprint of cut fields that affect preview/review UI. */
export const cutsContentFingerprint = (cuts: CutOutput[]): string =>
  cuts
    .map((cut) =>
      [
        cut.id,
        cut.cutFileId ?? "",
        cut.reviewStatus ?? "",
        cut.startSec,
        cut.endSec,
      ].join(":"),
    )
    .join("|");

/**
 * Returns the previous cuts array when poll/SSE payloads are referentially new
 * but semantically unchanged — prevents video elements from re-seeking.
 */
export const stabilizeCutsSnapshot = (
  next: CutOutput[],
  stableRef: { current: CutOutput[] },
  fingerprintRef: { current: string },
): CutOutput[] => {
  const fingerprint = cutsContentFingerprint(next);
  if (fingerprint === fingerprintRef.current && stableRef.current.length > 0) {
    return stableRef.current;
  }
  fingerprintRef.current = fingerprint;
  stableRef.current = next;
  return next;
};

export const countApprovedCuts = (cuts: CutOutput[]): number =>
  cuts.filter((cut) => cut.reviewStatus === "approved").length;

/** Pause reason the cuts agent emits when it stops for manual cut review. */
export const AWAITING_CUT_REVIEW = "awaiting_cut_review";

/** Pause reason while clip renders are still in flight. */
export const AWAITING_RENDERS = "awaiting_renders";

const readNumberFromPayload = (
  payload: unknown,
  key: string,
): number | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
};

/** Reads render progress from run output, dispatch step, and cut file ids. */
export const extractRenderProgressFromRun = (params: {
  run: AgentRunStatusDto;
  steps?: AgentRunStepDto[];
}): { totalCuts: number; renderedCount: number } => {
  const outputTotalCuts =
    readNumberFromPayload(params.run.outputPayload, "totalCuts") ?? 0;
  const outputRenderedCount =
    readNumberFromPayload(params.run.outputPayload, "renderedCount") ?? 0;

  const dispatchStep = params.steps?.find(
    (item) => item.stepKey === "dispatch_renders",
  );
  const dispatchTotalCuts =
    readNumberFromPayload(dispatchStep?.outputPayload, "totalCuts") ?? 0;
  const dispatchRenderedCount =
    readNumberFromPayload(dispatchStep?.outputPayload, "renderedCount") ?? 0;

  const cuts = extractCutsFromRun(params);
  const cutsWithFileId = cuts.filter((cut) => Boolean(cut.cutFileId)).length;

  const totalCuts = Math.max(outputTotalCuts, dispatchTotalCuts, cuts.length);
  const renderedCount = Math.max(
    outputRenderedCount,
    dispatchRenderedCount,
    cutsWithFileId,
  );

  return { totalCuts, renderedCount };
};

/**
 * A cuts run needs manual review iff the backend paused it for cut review.
 * That pause is decided once, at run start, only when auto-accept was off — so
 * review visibility must depend on the run's own state, never on the current
 * workspace setting (which can be toggled after a run is already paused and
 * would otherwise strand it with no way to resume).
 */
export const isRunAwaitingCutReview = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason"> | null | undefined,
): boolean =>
  run?.status === "PAUSED" && run?.pauseReason === AWAITING_CUT_REVIEW;

export const isRunAwaitingRenders = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason"> | null | undefined,
): boolean => run?.status === "PAUSED" && run?.pauseReason === AWAITING_RENDERS;
