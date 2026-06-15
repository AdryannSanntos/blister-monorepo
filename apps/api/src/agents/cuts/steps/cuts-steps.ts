import type { StepExecutionContext, StepExecutor } from '@company-os/agent-sdk';
import { validateStepOutput } from '@company-os/agent-sdk';
import { getCutsRunDeps } from '../ports/cuts-run-deps';
import { cutsOutputZod } from '../schemas/output.schema';

const buildAnalyzedSegments = (
  segments: Array<{ startSec: number; endSec: number; text: string }>,
) =>
  segments.map((segment, index) => ({
    id: `seg-${index + 1}`,
    startSec: segment.startSec,
    endSec: segment.endSec,
    text: segment.text,
    wordCount: segment.text.split(/\s+/).filter(Boolean).length,
  }));

/** Validates file, transcribes when needed, and prepares segments for the LLM. */
export const createResolveSourceStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-sdk').StepResult> => {
    const input = context.inputPayload as {
      sourceFileId?: string;
    };

    const sourceFileId = input.sourceFileId;
    if (!sourceFileId) {
      return {
        type: 'FAILED',
        error: 'sourceFileId is required',
      };
    }

    try {
      const deps = getCutsRunDeps();
      const file = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      let transcriptText = file.extractedText ?? '';
      let segments = transcriptText
        ? [{ startSec: 0, endSec: 0, text: transcriptText }]
        : [];

      if (!transcriptText) {
        const transcription = await deps.transcribeSource({
          file,
          agentId: context.agentId,
          stepKey: context.stepKey,
        });
        transcriptText = transcription.text;
        segments = transcription.segments;
      }

      const analyzedSegments = buildAnalyzedSegments(segments);

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
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to resolve source file',
      };
    }
  };
};

/** Renders one workspace file per cut clip (Trigger.dev + FFmpeg in production). */
export const createRenderCutsStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-sdk').StepResult> => {
    const rankOutput = context.previousStepsOutput.rank_segments as {
      cuts?: Array<Record<string, unknown>>;
      sourceFileId?: string;
      captionStyleId?: string;
    };

    const cuts = rankOutput.cuts;
    if (!Array.isArray(cuts) || cuts.length === 0) {
      return {
        type: 'FAILED',
        error: 'No cuts available to render',
      };
    }

    const sourceFileId = rankOutput.sourceFileId;
    if (!sourceFileId) {
      return {
        type: 'FAILED',
        error: 'sourceFileId is required to render cuts',
      };
    }

    try {
      const deps = getCutsRunDeps();
      const sourceFile = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      const rendered = await deps.renderCutClips({
        runId: context.runId,
        companyId: context.companyId,
        personalSpaceId: sourceFile.personalSpaceId,
        sourceFile,
        cuts: cuts as import('@company-os/types').CutOutput[],
      });

      return {
        type: 'CONTINUE',
        output: {
          cuts: rendered.cuts,
          sourceFileId: rendered.sourceFileId,
          captionStyleId: rankOutput.captionStyleId,
        },
      };
    } catch (error) {
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to render cut clips',
      };
    }
  };
};

export const createFinalizeCutsStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-sdk').StepResult> => {
    const reviewOutput = context.previousStepsOutput.await_cut_review;
    const validated = validateStepOutput(cutsOutputZod, reviewOutput ?? {});

    if (!validated.success) {
      return {
        type: 'FAILED',
        error: 'Cut output validation failed',
      };
    }

    return {
      type: 'CONTINUE',
      output: validated.data as Record<string, unknown>,
    };
  };
};

export const createCleanupSourceStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-sdk').StepResult> => {
    const input = context.inputPayload as {
      sourceFileId?: string;
      settings?: { deleteSourceAfterRun?: boolean };
    };

    if (!input.settings?.deleteSourceAfterRun || !input.sourceFileId) {
      return { type: 'CONTINUE', output: { deleted: false } };
    }

    try {
      await getCutsRunDeps().deleteSourceFile({
        sourceFileId: input.sourceFileId,
        companyId: context.companyId,
      });
      return { type: 'CONTINUE', output: { deleted: true } };
    } catch (error) {
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to delete source file',
      };
    }
  };
};

export const getCutsSettings = (context: StepExecutionContext) => {
  const input = context.inputPayload as {
    settings?: {
      maxCuts?: number;
      cutDurationSec?: number;
      addCaptions?: boolean;
      captionStyleId?: string;
      autoAcceptResults?: boolean;
    };
  };

  return {
    maxCuts: input.settings?.maxCuts ?? 5,
    cutDurationSec: input.settings?.cutDurationSec ?? 60,
    addCaptions: input.settings?.addCaptions ?? false,
    captionStyleId: input.settings?.captionStyleId,
    autoAcceptResults: input.settings?.autoAcceptResults ?? true,
  };
};
