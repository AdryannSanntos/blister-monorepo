import { createPauseStep } from '@company-os/agent-ia-sdk/agents';

type DispatchRendersOutput = {
  totalCuts?: number;
  renderedCount?: number;
  cuts?: unknown[];
  runFolderId?: string;
  sourceFileId?: string;
  captionStyleId?: string;
};

export const createAwaitRendersStep = () =>
  createPauseStep({
    pauseType: 'form',
    pauseReason: 'awaiting_renders',
    until: (context) => {
      const dispatch = context.previousStepsOutput.dispatch_renders as
        | DispatchRendersOutput
        | undefined;
      if (!dispatch) return false;
      const { renderedCount = 0, totalCuts = 1 } = dispatch;
      return renderedCount >= totalCuts;
    },
    onContinue: (context) => {
      const dispatch = context.previousStepsOutput.dispatch_renders as DispatchRendersOutput;
      return {
        totalCuts: dispatch.totalCuts ?? 0,
        renderedCount: dispatch.renderedCount ?? 0,
        cuts: dispatch.cuts ?? [],
        runFolderId: dispatch.runFolderId ?? '',
        sourceFileId: dispatch.sourceFileId ?? '',
        captionStyleId: dispatch.captionStyleId,
      };
    },
  });
