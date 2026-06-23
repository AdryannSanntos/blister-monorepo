import { devAgentLogger } from '../runtime/dev-agent-logger';

type CutsLogContext = Record<string, unknown>;

export const createCutsDevTimer = (): (() => number) => {
  const startedAt = Date.now();
  return () => Date.now() - startedAt;
};

const withStep = (stepKey: string, context?: CutsLogContext): CutsLogContext => ({
  stepKey,
  ...(context ?? {}),
});

export const logCutsDev = (
  stepKey: string,
  message: string,
  context?: CutsLogContext,
): void => {
  devAgentLogger.log(`[Cuts:${stepKey}] ${message}`, withStep(stepKey, context));
};

export const warnCutsDev = (
  stepKey: string,
  message: string,
  context?: CutsLogContext,
): void => {
  devAgentLogger.warn(`[Cuts:${stepKey}] ${message}`, withStep(stepKey, context));
};

export const errorCutsDev = (
  stepKey: string,
  message: string,
  error?: unknown,
  context?: CutsLogContext,
): void => {
  devAgentLogger.error(`[Cuts:${stepKey}] ${message}`, error, withStep(stepKey, context));
};

export const summarizeTranscript = (
  segments: Array<{ startSec: number; endSec: number; text: string }>,
  transcriptText: string,
): CutsLogContext => ({
  segmentCount: segments.length,
  transcriptChars: transcriptText.length,
  firstSegmentStartSec: segments[0]?.startSec,
  lastSegmentEndSec: segments.at(-1)?.endSec,
});

export const summarizeCuts = (
  cuts: Array<{ id: string; title: string; startSec: number; endSec: number }>,
): CutsLogContext => ({
  cutCount: cuts.length,
  cuts: cuts.map((cut) => ({
    id: cut.id,
    title: cut.title,
    startSec: cut.startSec,
    endSec: cut.endSec,
    durationSec: Math.round((cut.endSec - cut.startSec) * 10) / 10,
  })),
});

export const summarizeRenderProgress = (params: {
  totalCuts: number;
  renderedCount: number;
  cutId?: string;
  cutFileId?: string;
}): CutsLogContext => ({
  totalCuts: params.totalCuts,
  renderedCount: params.renderedCount,
  remaining: Math.max(params.totalCuts - params.renderedCount, 0),
  progressPct: params.totalCuts > 0
    ? Math.round((params.renderedCount / params.totalCuts) * 100)
    : 0,
  cutId: params.cutId,
  cutFileId: params.cutFileId,
});
