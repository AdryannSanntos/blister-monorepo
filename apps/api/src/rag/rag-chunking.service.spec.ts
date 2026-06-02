import type { PrismaService } from '../prisma/prisma.service';
import { RagChunkingService } from './rag-chunking.service';

/**
 * Minimal Prisma stub: run the transaction callback against an in-memory tx that
 * echoes each created chunk back, so we can assert the pure chunking behavior
 * without a database.
 */
function makePrismaStub(): PrismaService {
  let seq = 0;
  const tx = {
    ragChunk: {
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }: { data: { content: string; tokenCount: number } }) => ({
        id: `chunk-${seq++}`,
        ...data,
      }),
    },
  };
  return {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService;
}

describe('RagChunkingService.chunkDocument', () => {
  const service = new RagChunkingService(makePrismaStub());
  const TARGET_CHARS = 512 * 4; // TARGET_TOKENS * CHARS_PER_TOKEN

  it('splits a whitespace-collapsed blob into multiple bounded chunks', async () => {
    // Simulates extracted PDF text: one long line, no paragraph breaks.
    const sentence = 'O candidato atuou em projetos de software com IA aplicada. ';
    const blob = sentence.repeat(120); // ~7k chars, well above one chunk

    const chunks = await service.chunkDocument('doc-1', blob);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(TARGET_CHARS);
    }
  });

  it('hard-slices a single oversized token run with no sentence breaks', async () => {
    const blob = 'a'.repeat(TARGET_CHARS * 3 + 17); // no spaces or punctuation

    const chunks = await service.chunkDocument('doc-2', blob);

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(TARGET_CHARS);
    }
  });

  it('keeps a short document as a single chunk', async () => {
    const chunks = await service.chunkDocument('doc-3', 'Resumo curto do candidato.');
    expect(chunks).toHaveLength(1);
  });
});
