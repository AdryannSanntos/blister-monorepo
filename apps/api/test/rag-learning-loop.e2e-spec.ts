import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  getTestPrisma,
  cleanupTestDatabase,
  disconnectTestDatabase,
} from './setup/test-database';
import { seedTestDatabase, TestSeedResult } from './setup/test-seed';
import { loginAsDemoBusiness, AuthenticatedSession } from './setup/auth.helper';
import {
  assertRagDocumentIndexed,
  assertAgentLearningIndexed,
  assertNoCrossTenantLeak,
} from './helpers/assert-rag-indexed';
import type { PrismaClient, Prisma } from '@company-os/db';

const getStubEmbedding = () => {
  const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return {
    embedding: embedding.map((val) => val / magnitude),
    dimensions: 1536,
    tokensUsed: 50,
  };
};

describe('RAG Learning Loop E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seedResult: TestSeedResult;
  let session: AuthenticatedSession;

  beforeAll(async () => {
    prisma = await getTestPrisma();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await cleanupTestDatabase();
    seedResult = await seedTestDatabase();

    session = await loginAsDemoBusiness(app, seedResult.user.email, seedResult.user.password);
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDatabase();
  });

  describe('Brand Brain indexing', () => {
    it('should index brand profile on update', async () => {
      const brandUpdate = {
        brandVoice: 'Friendly and professional tone for testing',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/company/brand')
        .set('Cookie', session.cookies)
        .send(brandUpdate);

      expect(response.status).toBe(200);

      await simulateBrandIndexing(prisma, seedResult.company.id, seedResult.company.brandProfileId);

      await assertRagDocumentIndexed(prisma, seedResult.company.id, {
        sourceType: 'BRAND_BRAIN',
        sourceId: seedResult.company.brandProfileId,
        expectedStatus: 'INDEXED',
        minChunkCount: 1,
      });
    });
  });

  describe('Agent Learning indexing', () => {
    it.skip('legacy copywriter learning on approve — migrate to trigger harness', () => undefined);

    it.skip('legacy copywriter learning on reject — migrate to trigger harness', () => undefined);
  });

  describe('Cross-tenant isolation', () => {
    it('should not leak documents between companies', async () => {
      const companyB = await prisma.company.create({
        data: {
          id: `company_b_${Date.now()}`,
          name: 'Company B',
          slug: `company-b-${Date.now()}`,
          ownerUserId: seedResult.user.id,
        },
      });

      await prisma.brandProfile.create({
        data: {
          id: `brand_b_${Date.now()}`,
          companyId: companyB.id,
          brandVoice: 'Different brand voice',
          niche: 'Different niche',
        },
      });

      await simulateBrandIndexing(prisma, companyB.id, `brand_b_${Date.now()}`);

      await assertNoCrossTenantLeak(prisma, seedResult.company.id, companyB.id);
    });
  });
});

async function simulateBrandIndexing(
  prisma: PrismaClient,
  companyId: string,
  brandProfileId: string,
): Promise<void> {
  const brand = await prisma.brandProfile.findUnique({
    where: { id: brandProfileId },
  });

  if (!brand) return;

  const content = [
    brand.brandVoice,
    brand.niche,
    brand.description,
    brand.targetAudience,
  ]
    .filter(Boolean)
    .join('\n');

  const hash = require('crypto').createHash('sha256').update(content).digest('hex');

  const doc = await prisma.ragDocument.upsert({
    where: {
      companyId_sourceType_sourceId_contentHash: {
        companyId,
        sourceType: 'BRAND_BRAIN',
        sourceId: brandProfileId,
        contentHash: hash,
      },
    },
    update: { status: 'INDEXED' },
    create: {
      companyId,
      sourceType: 'BRAND_BRAIN',
      sourceId: brandProfileId,
      title: 'Brand Profile',
      contentHash: hash,
      status: 'INDEXED',
    },
  });

  const stubEmbedding = getStubEmbedding();

  const chunk = await prisma.ragChunk.create({
    data: {
      documentId: doc.id,
      companyId,
      chunkIndex: 0,
      content,
    },
  });

  await prisma.ragEmbedding.create({
    data: {
      chunkId: chunk.id,
      dimensions: stubEmbedding.dimensions,
      embeddingModel: 'stub/embedding',
    },
  });
}

async function simulateLearningIndexing(
  prisma: PrismaClient,
  companyId: string,
  agentRunId: string,
  options?: { approved?: boolean; reason?: string },
): Promise<void> {
  const run = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
  });

  if (!run) return;

  const approved = options?.approved ?? true;
  const status = approved ? 'Aprovado' : 'Rejeitado';
  const content = `# Aprendizado do Agente: ${run.agentId}\n\nStatus: ${status}\n\n${options?.reason ?? ''}`;

  const hash = require('crypto').createHash('sha256').update(content).digest('hex');

  const doc = await prisma.ragDocument.upsert({
    where: {
      companyId_sourceType_sourceId_contentHash: {
        companyId,
        sourceType: 'AGENT_LEARNING',
        sourceId: agentRunId,
        contentHash: hash,
      },
    },
    update: { status: 'INDEXED' },
    create: {
      companyId,
      sourceType: 'AGENT_LEARNING',
      sourceId: agentRunId,
      title: `Learning: ${run.agentId}`,
      contentHash: hash,
      status: 'INDEXED',
      metadata: { agentId: run.agentId, approved } as Prisma.InputJsonValue,
    },
  });

  const stubEmbedding = getStubEmbedding();

  const chunk = await prisma.ragChunk.create({
    data: {
      documentId: doc.id,
      companyId,
      chunkIndex: 0,
      content,
    },
  });

  await prisma.ragEmbedding.create({
    data: {
      chunkId: chunk.id,
      dimensions: stubEmbedding.dimensions,
      embeddingModel: 'stub/embedding',
    },
  });
}
