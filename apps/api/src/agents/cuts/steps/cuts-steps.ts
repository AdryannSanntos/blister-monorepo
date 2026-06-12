import type { StepExecutionContext, StepExecutor } from '@company-os/agent-sdk';
import { getCutsRunDeps } from '../ports/cuts-run-deps';

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
        const transcription = await deps.transcribeSource({ file });
        transcriptText = transcription.text;
        segments = transcription.segments;
      }

      return {
        type: 'CONTINUE',
        output: {
          sourceFileId: file.id,
          sourceFileName: file.name,
          transcriptText,
          segments,
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

export const createAnalyzeSourceStep = (): StepExecutor => {
  return async (context): Promise<import('@company-os/agent-sdk').StepResult> => {
    const resolveOutput = context.previousStepsOutput.resolve_source as {
      segments?: Array<{ startSec: number; endSec: number; text: string }>;
      transcriptText?: string;
    };

    const segments = resolveOutput?.segments ?? [];
    const transcriptText = resolveOutput?.transcriptText ?? segments.map((s) => s.text).join(' ');

    const analyzedSegments = segments.map((segment, index) => ({
      id: `seg-${index + 1}`,
      startSec: segment.startSec,
      endSec: segment.endSec,
      text: segment.text,
      wordCount: segment.text.split(/\s+/).filter(Boolean).length,
    }));

    return {
      type: 'CONTINUE',
      output: {
        transcriptText,
        analyzedSegments,
      },
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
