import type { PrismaClient, RagSourceType } from '@company-os/db';

export interface RagDocumentAssertion {
  sourceType: RagSourceType;
  sourceId: string;
  expectedStatus?: 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED';
  minChunkCount?: number;
  contentContains?: string;
}

export async function assertRagDocumentIndexed(
  prisma: PrismaClient,
  companyId: string,
  assertion: RagDocumentAssertion,
): Promise<void> {
  const document = await prisma.ragDocument.findFirst({
    where: {
      companyId,
      sourceType: assertion.sourceType,
      sourceId: assertion.sourceId,
    },
    include: {
      chunks: {
        include: {
          embedding: true,
        },
      },
    },
  });

  if (!document) {
    throw new Error(
      `RagDocument not found for sourceType=${assertion.sourceType}, sourceId=${assertion.sourceId}`,
    );
  }

  const expectedStatus = assertion.expectedStatus ?? 'INDEXED';
  if (document.status !== expectedStatus) {
    throw new Error(
      `RagDocument status mismatch: expected ${expectedStatus}, got ${document.status}`,
    );
  }

  if (assertion.minChunkCount !== undefined) {
    if (document.chunks.length < assertion.minChunkCount) {
      throw new Error(
        `RagDocument chunk count too low: expected at least ${assertion.minChunkCount}, got ${document.chunks.length}`,
      );
    }
  }

  if (assertion.contentContains) {
    const allContent = document.chunks.map((c) => c.content).join(' ');
    if (!allContent.includes(assertion.contentContains)) {
      throw new Error(
        `RagDocument chunks do not contain expected content: "${assertion.contentContains}"`,
      );
    }
  }

  if (expectedStatus === 'INDEXED') {
    const chunksWithEmbedding = document.chunks.filter((c) => c.embedding);
    if (chunksWithEmbedding.length === 0) {
      throw new Error('RagDocument is INDEXED but has no embeddings');
    }
  }
}

export async function assertAgentLearningIndexed(
  prisma: PrismaClient,
  companyId: string,
  agentRunId: string,
  options?: {
    expectedApproved?: boolean;
    contentContains?: string;
  },
): Promise<void> {
  const document = await prisma.ragDocument.findFirst({
    where: {
      companyId,
      sourceType: 'AGENT_LEARNING',
      sourceId: agentRunId,
    },
    include: {
      chunks: true,
    },
  });

  if (!document) {
    throw new Error(
      `AGENT_LEARNING document not found for agentRunId=${agentRunId}`,
    );
  }

  if (document.status !== 'INDEXED') {
    throw new Error(
      `AGENT_LEARNING document status is ${document.status}, expected INDEXED`,
    );
  }

  if (options?.expectedApproved !== undefined) {
    const allContent = document.chunks.map((c) => c.content).join(' ');
    const hasApproved = allContent.toLowerCase().includes('aprovado');
    const hasRejected = allContent.toLowerCase().includes('rejeitado');

    if (options.expectedApproved && !hasApproved) {
      throw new Error(
        'AGENT_LEARNING document does not indicate approval status',
      );
    }
    if (!options.expectedApproved && !hasRejected) {
      throw new Error(
        'AGENT_LEARNING document does not indicate rejection status',
      );
    }
  }

  if (options?.contentContains) {
    const allContent = document.chunks.map((c) => c.content).join(' ');
    if (!allContent.includes(options.contentContains)) {
      throw new Error(
        `AGENT_LEARNING document does not contain: "${options.contentContains}"`,
      );
    }
  }
}

export async function assertBrandBrainIndexed(
  prisma: PrismaClient,
  companyId: string,
  brandProfileId: string,
): Promise<void> {
  await assertRagDocumentIndexed(prisma, companyId, {
    sourceType: 'BRAND_BRAIN',
    sourceId: brandProfileId,
    expectedStatus: 'INDEXED',
    minChunkCount: 1,
  });
}

export async function assertNoCrossTenantLeak(
  prisma: PrismaClient,
  companyAId: string,
  companyBId: string,
): Promise<void> {
  const companyADocs = await prisma.ragDocument.findMany({
    where: { companyId: companyAId },
  });

  const companyBDocs = await prisma.ragDocument.findMany({
    where: { companyId: companyBId },
  });

  const companyADocIds = new Set(companyADocs.map((d) => d.id));
  const companyBDocIds = new Set(companyBDocs.map((d) => d.id));

  const overlap = [...companyADocIds].filter((id) => companyBDocIds.has(id));
  if (overlap.length > 0) {
    throw new Error(
      `Cross-tenant leak detected: ${overlap.length} documents shared between companies`,
    );
  }

  const companyAChunks = await prisma.ragChunk.findMany({
    where: { document: { companyId: companyAId } },
  });

  for (const chunk of companyAChunks) {
    if (companyBDocIds.has(chunk.documentId)) {
      throw new Error(
        `Cross-tenant leak: chunk ${chunk.id} from company A references company B document`,
      );
    }
  }
}
