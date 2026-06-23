import type { StepExecutor } from '@company-os/agent-ia-sdk/agents';
import type { CutOutput } from '@company-os/types';
import {
  createCutsDevTimer,
  errorCutsDev,
  logCutsDev,
  summarizeCuts,
} from '../cuts-dev-logger';
import type { ClipCaption, OverlayDispatchConfig } from '../ports/cuts-run-deps';
import { getCutsRunDeps } from '../ports/cuts-run-deps';
import { getCutsSettings } from './cuts-steps';

type AnalyzedWord = { text: string; startSec: number; endSec: number };
type AnalyzedSegment = {
  startSec: number;
  endSec: number;
  words?: AnalyzedWord[];
};

/**
 * Collect the words spoken within a cut's window and re-base their timing to
 * the start of the rendered clip (ms). Returns [] when no word timing exists —
 * the renderer then simply skips captions for that clip.
 */
const buildClipCaptions = (
  segments: AnalyzedSegment[],
  cut: { startSec: number; endSec: number },
): ClipCaption[] => {
  const captions: ClipCaption[] = [];
  for (const segment of segments) {
    for (const word of segment.words ?? []) {
      if (word.endSec <= cut.startSec || word.startSec >= cut.endSec) continue;
      captions.push({
        text: word.text,
        startMs: Math.max(0, (word.startSec - cut.startSec) * 1000),
        endMs: Math.max(0, (word.endSec - cut.startSec) * 1000),
      });
    }
  }
  return captions;
};

export const createDispatchRendersStep = (): StepExecutor => {
  return async (context) => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();

    const rankOutput = context.previousStepsOutput.rank_segments as {
      cuts?: CutOutput[];
      sourceFileId?: string;
      captionStyleId?: string;
    };

    const cuts = rankOutput.cuts;
    if (!Array.isArray(cuts) || cuts.length === 0) {
      errorCutsDev(stepKey, 'No cuts to render', undefined, { runId: context.runId });
      return { type: 'FAILED', error: 'No cuts to render' };
    }

    const sourceFileId = rankOutput.sourceFileId;
    if (!sourceFileId) {
      errorCutsDev(stepKey, 'Missing sourceFileId from rank output', undefined, {
        runId: context.runId,
      });
      return { type: 'FAILED', error: 'sourceFileId missing from rank_segments output' };
    }

    logCutsDev(stepKey, 'Dispatching renders', {
      runId: context.runId,
      ...summarizeCuts(cuts),
      sourceFileId,
      captionStyleId: rankOutput.captionStyleId,
    });

    try {
      const deps = getCutsRunDeps();

      const sourceFile = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      logCutsDev(stepKey, 'Source file loaded for render', {
        runId: context.runId,
        fileName: sourceFile.name,
        storageKey: sourceFile.storageKey,
      });

      const runFolderId = await deps.ensureRunFolder({
        runId: context.runId,
        companyId: context.companyId,
        sourceFile,
      });

      logCutsDev(stepKey, 'Run folder ready', {
        runId: context.runId,
        runFolderId,
        elapsedMs: elapsed(),
      });

      if (deps.renderCutsSynchronously) {
        logCutsDev(stepKey, 'Rendering cuts synchronously (test mode)', {
          runId: context.runId,
          cutCount: cuts.length,
        });

        const renderedCuts = await deps.renderCutsSynchronously({
          runId: context.runId,
          runFolderId,
          companyId: context.companyId,
          cuts,
          sourceFile,
        });

        logCutsDev(stepKey, 'Synchronous render completed', {
          runId: context.runId,
          renderedCount: renderedCuts.length,
          totalCuts: cuts.length,
          elapsedMs: elapsed(),
        });

        return {
          type: 'CONTINUE',
          output: {
            totalCuts: cuts.length,
            renderedCount: renderedCuts.length,
            cuts: renderedCuts,
            runFolderId,
            sourceFileId,
            captionStyleId: rankOutput.captionStyleId,
          },
        };
      }

      const settings = getCutsSettings(context);
      const resolveSource = context.previousStepsOutput.resolve_source as
        | { analyzedSegments?: AnalyzedSegment[] }
        | undefined;
      const analyzedSegments = resolveSource?.analyzedSegments ?? [];

      let overlay: OverlayDispatchConfig | undefined;
      if (settings.addTitle || settings.addCaptions) {
        const captionsByCutId: Record<string, ClipCaption[]> = {};
        if (settings.addCaptions) {
          for (const cut of cuts) {
            captionsByCutId[cut.id] = buildClipCaptions(analyzedSegments, cut);
          }
        }
        overlay = {
          addTitle: settings.addTitle,
          titleStyleId: settings.titleStyleId,
          titleDurationSec: settings.titleDurationSec,
          titlePosition: settings.titlePosition,
          addCaptions: settings.addCaptions,
          captionStyleId: settings.captionStyleId,
          captionPosition: settings.captionPosition,
          captionsByCutId,
        };
      }

      logCutsDev(stepKey, 'Triggering batch render jobs', {
        runId: context.runId,
        runFolderId,
        cutCount: cuts.length,
        overlayEnabled: Boolean(overlay),
        addTitle: settings.addTitle,
        addCaptions: settings.addCaptions,
      });

      await deps.dispatchRenderJobs({
        runId: context.runId,
        runFolderId,
        companyId: context.companyId,
        cuts,
        sourceFile,
        overlay,
      });

      logCutsDev(stepKey, 'Render jobs dispatched', {
        runId: context.runId,
        totalCuts: cuts.length,
        renderedCount: 0,
        elapsedMs: elapsed(),
      });

      return {
        type: 'CONTINUE',
        output: {
          totalCuts: cuts.length,
          renderedCount: 0,
          cuts: cuts.map((cut) => ({ ...cut, cutFileId: undefined })),
          runFolderId,
          sourceFileId,
          captionStyleId: rankOutput.captionStyleId,
        },
      };
    } catch (error) {
      errorCutsDev(stepKey, 'Render dispatch failed', error, {
        runId: context.runId,
        elapsedMs: elapsed(),
      });
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to dispatch render jobs',
      };
    }
  };
};
