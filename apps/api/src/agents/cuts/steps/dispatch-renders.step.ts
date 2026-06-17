import type { StepExecutor } from '@company-os/agent-sdk';
import type { CutOutput } from '@company-os/types';
import { getCutsRunDeps } from '../ports/cuts-run-deps';

export const createDispatchRendersStep = (): StepExecutor => {
  return async (context) => {
    const rankOutput = context.previousStepsOutput.rank_segments as {
      cuts?: CutOutput[];
      sourceFileId?: string;
      captionStyleId?: string;
    };

    const cuts = rankOutput.cuts;
    if (!Array.isArray(cuts) || cuts.length === 0) {
      return { type: 'FAILED', error: 'No cuts to render' };
    }

    const sourceFileId = rankOutput.sourceFileId;
    if (!sourceFileId) {
      return { type: 'FAILED', error: 'sourceFileId missing from rank_segments output' };
    }

    try {
      const deps = getCutsRunDeps();

      const sourceFile = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      const runFolderId = await deps.ensureRunFolder({
        runId: context.runId,
        companyId: context.companyId,
        sourceFile,
      });

      await deps.dispatchRenderJobs({
        runId: context.runId,
        runFolderId,
        companyId: context.companyId,
        cuts,
        sourceFile,
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
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to dispatch render jobs',
      };
    }
  };
};
