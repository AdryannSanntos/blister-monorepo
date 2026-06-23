import type { AgentIaSdk } from '@company-os/agent-ia-sdk';
import { ProviderNotConfiguredError } from '@company-os/agent-ia-sdk';
import type { TranscriptionResult } from '@company-os/agent-ia-sdk';
import { buildCutsRunDeps } from './build-cuts-run-deps';

const createPrismaMock = () => ({
  workspaceFile: {
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

const createStorageMock = () => ({
  getPresignedDownloadUrl: jest
    .fn()
    .mockResolvedValue('https://example.com/video.mp4'),
  deleteObject: jest.fn(),
});

/** Builds a fake SDK whose transcription provider returns the given result. */
const sdkWithTranscript = (
  transcribe: jest.Mock<Promise<TranscriptionResult>, [unknown]>,
): AgentIaSdk =>
  ({ ia: { transcription: () => ({ transcribe }) } }) as unknown as AgentIaSdk;

/** Builds a fake SDK whose transcription provider is not configured. */
const sdkWithoutTranscription = (): AgentIaSdk =>
  ({
    ia: {
      transcription: () => {
        throw new ProviderNotConfiguredError('assemblyai', 'ASSEMBLYAI_API_KEY');
      },
    },
  }) as unknown as AgentIaSdk;

describe('buildCutsRunDeps', () => {
  const originalMode = process.env.AGENT_EXECUTION_MODE;

  afterEach(() => {
    process.env.AGENT_EXECUTION_MODE = originalMode;
    jest.restoreAllMocks();
  });

  it('transcribes video sources via the SDK instead of using extractedText shortcut', async () => {
    process.env.AGENT_EXECUTION_MODE = 'trigger';

    const prisma = createPrismaMock();
    const storage = createStorageMock();

    prisma.workspaceFile.findFirst.mockResolvedValue({
      id: 'file-1',
      companyId: 'company-1',
      personalSpaceId: null,
      mimeType: 'video/mp4',
      storageKey: 'company/uploads/source.mp4',
      extractedText: 'Cached plain text without timestamps',
      name: 'source.mp4',
    });

    const transcribe = jest.fn<Promise<TranscriptionResult>, [unknown]>().mockResolvedValue({
      text: 'Conteúdo real do vídeo em português.',
      segments: [
        { start: 12_000, end: 72_000, text: 'Primeiro trecho relevante.' },
        { start: 120_000, end: 180_000, text: 'Segundo trecho relevante.' },
      ],
    });

    const deps = buildCutsRunDeps(
      prisma as never,
      storage as never,
      sdkWithTranscript(transcribe),
    );

    const file = await deps.resolveSourceFile({
      sourceFileId: 'file-1',
      companyId: 'company-1',
    });

    const transcript = await deps.transcribeSource({ file });

    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcript.segments).toEqual([
      { startSec: 12, endSec: 72, text: 'Primeiro trecho relevante.' },
      { startSec: 120, endSec: 180, text: 'Segundo trecho relevante.' },
    ]);
    expect(prisma.workspaceFile.update).toHaveBeenCalled();
  });

  it('accepts timed segments returned by the transcription provider', async () => {
    process.env.AGENT_EXECUTION_MODE = 'trigger';

    const prisma = createPrismaMock();
    const storage = createStorageMock();

    prisma.workspaceFile.findFirst.mockResolvedValue({
      id: 'file-1',
      companyId: 'company-1',
      personalSpaceId: null,
      mimeType: 'video/mp4',
      storageKey: 'company/uploads/source.mp4',
      extractedText: null,
      name: 'source.mp4',
    });

    const transcribe = jest.fn<Promise<TranscriptionResult>, [unknown]>().mockResolvedValue({
      text: 'Conteúdo real do vídeo em português.',
      segments: [{ start: 12_000, end: 72_000, text: 'Primeiro trecho relevante.' }],
    });

    const deps = buildCutsRunDeps(
      prisma as never,
      storage as never,
      sdkWithTranscript(transcribe),
    );

    const file = await deps.resolveSourceFile({
      sourceFileId: 'file-1',
      companyId: 'company-1',
    });

    const transcript = await deps.transcribeSource({ file });

    expect(transcript.segments).toEqual([
      { startSec: 12, endSec: 72, text: 'Primeiro trecho relevante.' },
    ]);
  });

  it('throws when transcription provider is not configured', async () => {
    process.env.AGENT_EXECUTION_MODE = 'trigger';

    const prisma = createPrismaMock();
    const storage = createStorageMock();

    const deps = buildCutsRunDeps(
      prisma as never,
      storage as never,
      sdkWithoutTranscription(),
    );

    const fileArg = {
      id: 'file-1',
      companyId: 'company-1',
      personalSpaceId: null,
      mimeType: 'video/mp4',
      storageKey: 'files/file-1.mp4',
      extractedText: null,
      name: 'source.mp4',
    };

    await expect(deps.transcribeSource({ file: fileArg })).rejects.toThrow(
      ProviderNotConfiguredError,
    );
  });

  it('rejects transcribeSource when transcription exceeds timeout', async () => {
    jest.useFakeTimers();
    process.env.AGENT_EXECUTION_MODE = 'trigger';

    const prisma = createPrismaMock();
    const storage = createStorageMock();

    prisma.workspaceFile.findFirst.mockResolvedValue({
      id: 'file-1',
      companyId: 'company-1',
      personalSpaceId: null,
      mimeType: 'video/mp4',
      storageKey: 'company/uploads/source.mp4',
      extractedText: null,
      name: 'source.mp4',
    });

    const transcribe = jest.fn<Promise<TranscriptionResult>, [unknown]>().mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves — simulates a hung transcription */
        }),
    );

    const deps = buildCutsRunDeps(
      prisma as never,
      storage as never,
      sdkWithTranscript(transcribe),
    );

    const file = await deps.resolveSourceFile({
      sourceFileId: 'file-1',
      companyId: 'company-1',
    });

    const transcribePromise = deps.transcribeSource({ file });
    const assertion = expect(transcribePromise).rejects.toThrow('Transcription timed out');

    await jest.advanceTimersByTimeAsync(40 * 60 * 1000 + 1);

    await assertion;

    jest.useRealTimers();
  });
});
