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

export type TranscriptSegment = {
  startSec: number;
  endSec: number;
  text: string;
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptSegment[];
};

export type RenderCutClipsParams = {
  runId: string;
  companyId: string;
  personalSpaceId: string | null;
  sourceFile: SourceFileRecord;
  cuts: CutOutput[];
};

export type RenderCutClipsResult = {
  cuts: CutOutput[];
  sourceFileId: string;
  captionStyleId?: string;
};

export type EnsureRunFolderParams = {
  runId: string;
  companyId: string;
  sourceFile: SourceFileRecord;
};

export type DispatchRenderJobsParams = {
  runId: string;
  runFolderId: string;
  companyId: string;
  cuts: CutOutput[];
  sourceFile: SourceFileRecord;
};

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
  renderCutClips: (params: RenderCutClipsParams) => Promise<RenderCutClipsResult>;
  deleteSourceFile: (params: {
    sourceFileId: string;
    companyId: string;
  }) => Promise<void>;
  ensureRunFolder: (params: EnsureRunFolderParams) => Promise<string>;
  dispatchRenderJobs: (params: DispatchRenderJobsParams) => Promise<void>;
};

const STUB_TRANSCRIPT: TranscriptionResult = {
  text: 'Welcome to the show. Today we discuss retention hooks and viral moments.',
  segments: [
    { startSec: 0, endSec: 45, text: 'Welcome to the show.' },
    {
      startSec: 45,
      endSec: 120,
      text: 'Today we discuss retention hooks and viral moments.',
    },
    { startSec: 120, endSec: 240, text: 'Let me share a controversial take on content.' },
    { startSec: 240, endSec: 360, text: 'Social proof from our students changed everything.' },
  ],
};

export const createStubCutsRunDeps = (
  overrides?: Partial<CutsRunDeps>,
): CutsRunDeps => ({
  resolveSourceFile: async ({ sourceFileId }) => {
    if (sourceFileId === 'invalid-file') {
      throw new Error('Source file not found in workspace');
    }
    return {
      id: sourceFileId,
      companyId: 'harness_company',
      personalSpaceId: null,
      mimeType: 'video/mp4',
      storageKey: `files/${sourceFileId}.mp4`,
      extractedText: null,
      name: 'source.mp4',
    };
  },
  transcribeSource: async () => STUB_TRANSCRIPT,
  renderCutClips: async ({ cuts, sourceFile, runId }) => ({
    cuts: cuts.map((cut) => ({
      ...cut,
      cutFileId: `stub-file-${runId}-${cut.id}`,
    })),
    sourceFileId: sourceFile.id,
  }),
  deleteSourceFile: async () => {},
  ensureRunFolder: async ({ runId }) => `stub-run-folder-${runId}`,
  dispatchRenderJobs: async () => {},
  ...overrides,
});

let activeDeps: CutsRunDeps = createStubCutsRunDeps();

export const getCutsRunDeps = (): CutsRunDeps => activeDeps;

export const setCutsRunDeps = (deps: CutsRunDeps): void => {
  activeDeps = deps;
};

export const resetCutsRunDeps = (): void => {
  activeDeps = createStubCutsRunDeps();
};
