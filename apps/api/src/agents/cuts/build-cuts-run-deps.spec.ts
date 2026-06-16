import { buildCutsRunDeps } from './build-cuts-run-deps';
import { createStubCutsRunDeps } from './ports/cuts-run-deps';

const createPrismaMock = () => ({
  workspaceFile: {
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

const createStorageMock = () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://example.com/video.mp4'),
  deleteObject: jest.fn(),
});

describe('buildCutsRunDeps', () => {
  const originalMode = process.env.AGENT_EXECUTION_MODE;

  afterEach(() => {
    process.env.AGENT_EXECUTION_MODE = originalMode;
    jest.restoreAllMocks();
  });

  it('transcribes video sources with AssemblyAI instead of using extractedText shortcut', async () => {
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

    const transcribeSpy = jest
      .spyOn(
        await import('../../ai-runtime/adapters/assemblyai-stt.adapter'),
        'transcribeWithAssemblyAi',
      )
      .mockResolvedValue({
        text: 'Conteúdo real do vídeo em português.',
        utterances: [
          { start: 12_000, end: 72_000, text: 'Primeiro trecho relevante.' },
          { start: 120_000, end: 180_000, text: 'Segundo trecho relevante.' },
        ],
      });

    const deps = buildCutsRunDeps(prisma as never, storage as never, {
      assemblyAiApiKey: 'test-key',
    });

    const file = await deps.resolveSourceFile({
      sourceFileId: 'file-1',
      companyId: 'company-1',
    });

    const transcript = await deps.transcribeSource({
      file,
    });

    expect(transcribeSpy).toHaveBeenCalledTimes(1);
    expect(transcript.segments).toEqual([
      { startSec: 12, endSec: 72, text: 'Primeiro trecho relevante.' },
      { startSec: 120, endSec: 180, text: 'Segundo trecho relevante.' },
    ]);
    expect(prisma.workspaceFile.update).toHaveBeenCalled();
  });

  it('falls back to stub transcript only in inline-stub without AssemblyAI key', async () => {
    process.env.AGENT_EXECUTION_MODE = 'inline-stub';

    const prisma = createPrismaMock();
    const storage = createStorageMock();
    const stub = createStubCutsRunDeps();

    const deps = buildCutsRunDeps(prisma as never, storage as never, {});

    const result = await deps.transcribeSource({
      file: {
        id: 'file-1',
        companyId: 'company-1',
        personalSpaceId: null,
        mimeType: 'video/mp4',
        storageKey: 'files/file-1.mp4',
        extractedText: null,
        name: 'source.mp4',
      },
    });

    const expected = await stub.transcribeSource({
      file: {
        id: 'file-1',
        companyId: 'company-1',
        personalSpaceId: null,
        mimeType: 'video/mp4',
        storageKey: 'files/file-1.mp4',
        extractedText: null,
        name: 'source.mp4',
      },
    });

    expect(result).toEqual(expected);
  });
});
