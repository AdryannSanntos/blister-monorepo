import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  getTestPrisma,
  cleanupTestDatabase,
  disconnectTestDatabase,
} from '../setup/test-database';
import { seedTestDatabase, TestSeedResult } from '../setup/test-seed';
import { loginAsDemoBusiness, AuthenticatedSession } from '../setup/auth.helper';
import { getCreditSnapshot, assertCreditLedger } from '../helpers/assert-credit-ledger';
import { assertAgentLearningIndexed } from '../helpers/assert-rag-indexed';
import type { PrismaClient } from '../../src/generated/prisma';

const LIVE_TIMEOUT = 120000;

describe('Agent Live E2E (Layer 5)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seedResult: TestSeedResult;
  let session: AuthenticatedSession;

  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    if (!hasOpenRouterKey && !hasGeminiKey) {
      console.warn('No API keys available, skipping live tests');
      return;
    }

    prisma = await getTestPrisma();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await cleanupTestDatabase();
    seedResult = await seedTestDatabase();

    session = await loginAsDemoBusiness(app, seedResult.user.email, seedResult.user.password);
  }, LIVE_TIMEOUT);

  afterAll(async () => {
    if (app) await app.close();
    await disconnectTestDatabase();
  });

  describe('OpenRouter Live Tests', () => {
    it(
      'should complete copywriter run with real LLM',
      async () => {
        if (!hasOpenRouterKey) {
          console.log('Skipping: OPENROUTER_API_KEY not set');
          return;
        }

        const beforeSnapshot = await getCreditSnapshot(prisma, seedResult.company.id);

        const createResponse = await request(app.getHttpServer())
          .post('/api/agents/copywriter/run')
          .set('Cookie', session.cookies)
          .send({ userInput: 'Post sobre lançamento de bolo de cenoura artesanal' });

        expect(createResponse.status).toBe(201);
        const runId = createResponse.body.runId;

        await waitForRunCompletion(prisma, runId, LIVE_TIMEOUT - 10000);

        const run = await prisma.agentRun.findUnique({
          where: { id: runId },
          include: { steps: true },
        });

        expect(run?.status).toBe('COMPLETED');
        expect(run?.outputPayload).toHaveProperty('caption');
        expect(run?.outputPayload).toHaveProperty('hashtags');

        const llmStep = run?.steps.find((s) => s.stepKey === 'generate_caption');
        expect(llmStep?.llmModel).toContain('openrouter');
        expect(llmStep?.tokensInput).toBeGreaterThan(0);
        expect(llmStep?.tokensOutput).toBeGreaterThan(0);

        expect(Number(run?.creditCost)).toBeGreaterThan(0);

        await assertCreditLedger(prisma, seedResult.company.id, beforeSnapshot, {
          agentRunId: runId,
        });
      },
      LIVE_TIMEOUT,
    );

    it(
      'should index learning on approve with real embedding',
      async () => {
        if (!hasOpenRouterKey) {
          console.log('Skipping: OPENROUTER_API_KEY not set');
          return;
        }

        const createResponse = await request(app.getHttpServer())
          .post('/api/agents/copywriter/run')
          .set('Cookie', session.cookies)
          .send({ userInput: 'Post para teste de learning com embedding real' });

        const runId = createResponse.body.runId;
        await waitForRunCompletion(prisma, runId, LIVE_TIMEOUT - 10000);

        const approveResponse = await request(app.getHttpServer())
          .post(`/api/agents/runs/${runId}/approve`)
          .set('Cookie', session.cookies)
          .send({});

        expect(approveResponse.status).toBe(200);

        await new Promise((resolve) => setTimeout(resolve, 5000));

        await assertAgentLearningIndexed(prisma, seedResult.company.id, runId, {
          expectedApproved: true,
        });
      },
      LIVE_TIMEOUT,
    );
  });

  describe('Gemini Live Tests', () => {
    it(
      'should complete strategist run with Gemini',
      async () => {
        if (!hasGeminiKey) {
          console.log('Skipping: GEMINI_API_KEY not set');
          return;
        }

        const createResponse = await request(app.getHttpServer())
          .post('/api/agents/strategist/run')
          .set('Cookie', session.cookies)
          .send({ userInput: 'Planejar conteúdo semanal para confeitaria artesanal' });

        expect(createResponse.status).toBe(201);
        const runId = createResponse.body.runId;

        await waitForRunCompletion(prisma, runId, LIVE_TIMEOUT - 10000);

        const run = await prisma.agentRun.findUnique({
          where: { id: runId },
          include: { steps: true },
        });

        expect(run?.status).toBe('COMPLETED');
        expect(run?.outputPayload).toHaveProperty('topics');
        expect(run?.outputPayload).toHaveProperty('calendar');

        const llmStep = run?.steps.find((s) => s.stepKey === 'generate_plan');
        expect(llmStep?.llmModel).toContain('gemini');
      },
      LIVE_TIMEOUT,
    );

    it(
      'should generate image with Gemini',
      async () => {
        if (!hasGeminiKey) {
          console.log('Skipping: GEMINI_API_KEY not set');
          return;
        }

        const createResponse = await request(app.getHttpServer())
          .post('/api/agents/designer/run')
          .set('Cookie', session.cookies)
          .send({ userInput: 'Imagem para post de bolo de cenoura com chocolate' });

        expect(createResponse.status).toBe(201);
        const runId = createResponse.body.runId;

        await waitForRunCompletion(prisma, runId, LIVE_TIMEOUT - 10000);

        const run = await prisma.agentRun.findUnique({
          where: { id: runId },
        });

        expect(run?.status).toBe('COMPLETED');
        expect(run?.outputPayload).toHaveProperty('imageUrl');
        expect(run?.outputPayload).toHaveProperty('prompt');
      },
      LIVE_TIMEOUT,
    );
  });

  describe('Multi-provider cost calculation', () => {
    it(
      'should calculate costs correctly for different providers',
      async () => {
        if (!hasOpenRouterKey) {
          console.log('Skipping: OPENROUTER_API_KEY not set');
          return;
        }

        const createResponse = await request(app.getHttpServer())
          .post('/api/agents/copywriter/run')
          .set('Cookie', session.cookies)
          .send({ userInput: 'Test post for cost calculation' });

        const runId = createResponse.body.runId;
        await waitForRunCompletion(prisma, runId, LIVE_TIMEOUT - 10000);

        const run = await prisma.agentRun.findUnique({
          where: { id: runId },
          include: { steps: true },
        });

        const llmStep = run?.steps.find((s) => s.stepKey === 'generate_caption');

        expect(Number(llmStep?.creditCost)).toBeGreaterThan(0);

        const ledgerEntries = await prisma.creditLedger.findMany({
          where: { agentRunId: runId, type: 'DEBIT' },
        });

        expect(ledgerEntries.length).toBeGreaterThan(0);

        const totalLedger = ledgerEntries.reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        );
        expect(Number(run?.creditCost)).toBeCloseTo(totalLedger, 4);
      },
      LIVE_TIMEOUT,
    );
  });
});

async function waitForRunCompletion(
  prisma: PrismaClient,
  runId: string,
  timeoutMs: number,
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < timeoutMs) {
    const run = await prisma.agentRun.findUnique({ where: { id: runId } });

    if (run?.status === 'COMPLETED' || run?.status === 'FAILED') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Run ${runId} did not complete within ${timeoutMs}ms`);
}
