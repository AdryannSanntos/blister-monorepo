import type {
  StepExecutionContext,
  StepResult,
  StepRuntimeDeps,
} from '@company-os/agent-ia-sdk/agents';
import type { CutOutput } from '@company-os/types';

export type SourceFileRecord = {
  id: string;
  companyId: string | null;
  personalSpaceId: string | null;
  mimeType: string;
  storageKey: string;
  extractedText: string | null;
  name: string;
};

export type TranscriptWord = {
  text: string;
  startSec: number;
  endSec: number;
};

export type TranscriptSegment = {
  startSec: number;
  endSec: number;
  text: string;
  /** Diarization label (e.g. `A`, `B`) when the provider resolves speakers. */
  speaker?: string;
  /** Word-level timestamps (seconds) belonging to this segment, when resolved. */
  words?: TranscriptWord[];
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptSegment[];
};

export type EnsureRunFolderParams = {
  runId: string;
  companyId: string;
  sourceFile: SourceFileRecord;
};

/** A caption token positioned relative to the start of its rendered clip. */
export type ClipCaption = {
  text: string;
  startMs: number;
  endMs: number;
};

/**
 * Title/caption overlay config for a render batch. Style ids are resolved to
 * their TEXT_STYLE specs at dispatch time; captions are pre-clipped per cut.
 */
export type OverlayDispatchConfig = {
  addTitle: boolean;
  titleStyleId?: string;
  titleDurationSec: number;
  titlePosition: { x: number; y: number };
  addCaptions: boolean;
  captionStyleId?: string;
  captionPosition: { x: number; y: number };
  /** Clip-relative caption tokens keyed by cut id. */
  captionsByCutId: Record<string, ClipCaption[]>;
};

export type DispatchRenderJobsParams = {
  runId: string;
  runFolderId: string;
  companyId: string;
  cuts: CutOutput[];
  sourceFile: SourceFileRecord;
  /** When present and enabled, clips are rendered with burned text overlays. */
  overlay?: OverlayDispatchConfig;
};

export type RenderCutsSynchronouslyParams = DispatchRenderJobsParams;

export type CutsRunDeps = {
  resolveSourceFile: (params: {
    sourceFileId: string;
    companyId: string;
  }) => Promise<SourceFileRecord>;
  transcribeSource: (params: {
    file: SourceFileRecord;
    language?: string;
    agentId?: string;
    stepKey?: string;
  }) => Promise<TranscriptionResult>;
  deleteSourceFile: (params: {
    sourceFileId: string;
    companyId: string;
  }) => Promise<void>;
  ensureRunFolder: (params: EnsureRunFolderParams) => Promise<string>;
  dispatchRenderJobs: (params: DispatchRenderJobsParams) => Promise<void>;
  completeRankSegments?: (
    context: StepExecutionContext,
    deps: StepRuntimeDeps,
  ) => Promise<StepResult>;
  /** Test harness only — completes renders in-process instead of Trigger queue. */
  renderCutsSynchronously?: (params: RenderCutsSynchronouslyParams) => Promise<CutOutput[]>;
};

let activeDeps: CutsRunDeps | null = null;

export const getCutsRunDeps = (): CutsRunDeps => {
  if (!activeDeps) {
    throw new Error('Cuts run deps are not initialized');
  }
  return activeDeps;
};

export const setCutsRunDeps = (deps: CutsRunDeps): void => {
  activeDeps = deps;
};

export const resetCutsRunDeps = (): void => {
  activeDeps = null;
};
