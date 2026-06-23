import type { CutOutput } from '@company-os/types';
import type { CutsRunDeps, TranscriptionResult } from '../../src/agents/cuts/ports/cuts-run-deps';

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
  deleteSourceFile: async () => {},
  ensureRunFolder: async ({ runId }) => `stub-run-folder-${runId}`,
  dispatchRenderJobs: async () => {},
  renderCutsSynchronously: async ({ cuts, runId }) =>
    cuts.map((cut) => ({
      ...cut,
      cutFileId: `stub-file-${runId}-${cut.id}`,
    })),
  ...overrides,
});
