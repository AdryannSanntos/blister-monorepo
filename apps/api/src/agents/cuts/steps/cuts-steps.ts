import type { StepExecutionContext, StepExecutor } from '@company-os/agent-ia-sdk/agents';
import { validateStepOutput } from '@company-os/agent-ia-sdk/agents';
import type { CutsProcessingTimeframe, CutsRunOptions, CutsVideoGenre } from '@company-os/types';
import {
  createCutsDevTimer,
  errorCutsDev,
  logCutsDev,
  summarizeTranscript,
} from '../cuts-dev-logger';
import { getCutsRunDeps } from '../ports/cuts-run-deps';
import { cutsOutputZod } from '../schemas/output.schema';

type RawWord = {
  text: string;
  startSec: number;
  endSec: number;
};

type RawSegment = {
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
  words?: RawWord[];
};

const buildAnalyzedSegments = (segments: RawSegment[]) =>
  segments.map((segment, index) => ({
    id: `seg-${index + 1}`,
    startSec: segment.startSec,
    endSec: segment.endSec,
    text: segment.text,
    speaker: segment.speaker,
    words: segment.words,
  }));

const segmentIntersectsWindow = (
  segment: { startSec: number; endSec: number },
  window: CutsProcessingTimeframe,
) => segment.endSec > window.startSec && segment.startSec < window.endSec;

const clipSegmentToWindow = (segment: RawSegment, window: CutsProcessingTimeframe): RawSegment => ({
  startSec: Math.max(segment.startSec, window.startSec),
  endSec: Math.min(segment.endSec, window.endSec),
  text: segment.text,
  speaker: segment.speaker,
  words: segment.words?.filter(
    (word) => word.endSec > window.startSec && word.startSec < window.endSec,
  ),
});

const filterSegmentsByTimeframe = (segments: RawSegment[], window: CutsProcessingTimeframe) =>
  segments
    .filter((segment) => segmentIntersectsWindow(segment, window))
    .map((segment) => clipSegmentToWindow(segment, window))
    .filter((segment) => segment.endSec > segment.startSec);

/** Validates file, transcribes when needed, and prepares segments for the LLM. */
export const createResolveSourceStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-ia-sdk/agents').StepResult> => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();

    const input = context.inputPayload as {
      sourceFileId?: string;
      options?: CutsRunOptions;
    };

    const sourceFileId = input.sourceFileId;
    if (!sourceFileId) {
      errorCutsDev(stepKey, 'Missing sourceFileId', undefined, { runId: context.runId });
      return {
        type: 'FAILED',
        error: 'sourceFileId is required',
      };
    }

    logCutsDev(stepKey, 'Starting source resolution', {
      runId: context.runId,
      sourceFileId,
      hasTimeframe: Boolean(input.options?.processingTimeframe),
      videoGenre: input.options?.videoGenre,
    });

    try {
      const deps = getCutsRunDeps();
      const file = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      logCutsDev(stepKey, 'Source file resolved', {
        runId: context.runId,
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        hasCachedTranscript: Boolean(file.extractedText?.trim()),
        elapsedMs: elapsed(),
      });

      logCutsDev(stepKey, 'Starting transcription', {
        runId: context.runId,
        fileId: file.id,
      });

      const transcription = await deps.transcribeSource({
        file,
        agentId: context.agentId,
        stepKey: context.stepKey,
      });

      const timeframe = input.options?.processingTimeframe;
      const segments = timeframe
        ? filterSegmentsByTimeframe(transcription.segments, timeframe)
        : transcription.segments;

      logCutsDev(stepKey, 'Transcription completed', {
        runId: context.runId,
        ...summarizeTranscript(segments, transcription.text),
        timeframeApplied: Boolean(timeframe),
        elapsedMs: elapsed(),
      });

      if (segments.length === 0) {
        errorCutsDev(stepKey, 'No segments in processing timeframe', undefined, {
          runId: context.runId,
          timeframe,
        });
        return {
          type: 'FAILED',
          error: 'No transcript segments found in the selected processing timeframe',
        };
      }

      const transcriptText = segments
        .map((segment) => segment.text)
        .join(' ')
        .trim();
      const analyzedSegments = buildAnalyzedSegments(segments);

      logCutsDev(stepKey, 'Source ready for ranking', {
        runId: context.runId,
        analyzedSegmentCount: analyzedSegments.length,
        elapsedMs: elapsed(),
      });

      return {
        type: 'CONTINUE',
        output: {
          sourceFileId: file.id,
          sourceFileName: file.name,
          transcriptText,
          segments,
          analyzedSegments,
        },
      };
    } catch (error) {
      errorCutsDev(stepKey, 'Source resolution failed', error, {
        runId: context.runId,
        sourceFileId,
        elapsedMs: elapsed(),
      });
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to resolve source file',
      };
    }
  };
};

export const createFinalizeCutsStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-ia-sdk/agents').StepResult> => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();

    logCutsDev(stepKey, 'Finalizing cuts output', { runId: context.runId });

    const reviewOutput = context.previousStepsOutput.await_cut_review;
    const validated = validateStepOutput(cutsOutputZod, reviewOutput ?? {});

    if (!validated.success) {
      errorCutsDev(stepKey, 'Output validation failed', undefined, {
        runId: context.runId,
        elapsedMs: elapsed(),
      });
      return {
        type: 'FAILED',
        error: 'Cut output validation failed',
      };
    }

    const cuts = validated.data.cuts ?? [];
    logCutsDev(stepKey, 'Cuts output validated', {
      runId: context.runId,
      cutCount: cuts.length,
      approvedCount: cuts.filter((cut) => cut.reviewStatus === 'approved').length,
      rejectedCount: cuts.filter((cut) => cut.reviewStatus === 'rejected').length,
      elapsedMs: elapsed(),
    });

    return {
      type: 'CONTINUE',
      output: validated.data as Record<string, unknown>,
    };
  };
};

export const createCleanupSourceStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-ia-sdk/agents').StepResult> => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();

    const input = context.inputPayload as {
      sourceFileId?: string;
      settings?: { deleteSourceAfterRun?: boolean };
    };

    if (!input.settings?.deleteSourceAfterRun || !input.sourceFileId) {
      logCutsDev(stepKey, 'Skipping source cleanup', {
        runId: context.runId,
        deleteSourceAfterRun: input.settings?.deleteSourceAfterRun ?? false,
      });
      return { type: 'CONTINUE', output: { deleted: false } };
    }

    logCutsDev(stepKey, 'Deleting source file', {
      runId: context.runId,
      sourceFileId: input.sourceFileId,
    });

    try {
      await getCutsRunDeps().deleteSourceFile({
        sourceFileId: input.sourceFileId,
        companyId: context.companyId,
      });

      logCutsDev(stepKey, 'Source file deleted', {
        runId: context.runId,
        sourceFileId: input.sourceFileId,
        elapsedMs: elapsed(),
      });

      return { type: 'CONTINUE', output: { deleted: true } };
    } catch (error) {
      errorCutsDev(stepKey, 'Source cleanup failed', error, {
        runId: context.runId,
        sourceFileId: input.sourceFileId,
        elapsedMs: elapsed(),
      });
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to delete source file',
      };
    }
  };
};

type OverlayPoint = { x: number; y: number };

export const getCutsSettings = (context: StepExecutionContext) => {
  const input = context.inputPayload as {
    settings?: {
      maxCuts?: number;
      cutDurationSec?: number;
      addCaptions?: boolean;
      captionStyleId?: string;
      captionPosition?: OverlayPoint;
      addTitle?: boolean;
      titleStyleId?: string;
      titleDurationSec?: number;
      titlePosition?: OverlayPoint;
      autoAcceptResults?: boolean;
      modelTier?: 'auto' | 'basic' | 'pro';
    };
  };

  return {
    maxCuts: input.settings?.maxCuts ?? 5,
    cutDurationSec: input.settings?.cutDurationSec ?? 60,
    addCaptions: input.settings?.addCaptions ?? false,
    captionStyleId: input.settings?.captionStyleId,
    captionPosition: input.settings?.captionPosition ?? { x: 0.5, y: 0.85 },
    addTitle: input.settings?.addTitle ?? false,
    titleStyleId: input.settings?.titleStyleId,
    titleDurationSec: input.settings?.titleDurationSec ?? 5,
    titlePosition: input.settings?.titlePosition ?? { x: 0.5, y: 0.08 },
    autoAcceptResults: input.settings?.autoAcceptResults ?? true,
    modelTier: input.settings?.modelTier ?? 'basic',
  };
};

export const getCutsRunOptions = (context: StepExecutionContext): CutsRunOptions => {
  const input = context.inputPayload as { options?: CutsRunOptions };
  return input.options ?? {};
};

export const getCutsVideoGenre = (context: StepExecutionContext): CutsVideoGenre | undefined =>
  getCutsRunOptions(context).videoGenre;

export const getCutsProcessingTimeframe = (
  context: StepExecutionContext,
): CutsProcessingTimeframe | undefined => getCutsRunOptions(context).processingTimeframe;
