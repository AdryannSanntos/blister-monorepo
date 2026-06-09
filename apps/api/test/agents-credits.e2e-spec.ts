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
import { getCreditSnapshot, assertCreditLedger } from './helpers/assert-credit-ledger';
import { executeRunInline, getExecutionMode } from './setup/inline-executor';
import type { PrismaClient } from '../src/generated/prisma';

describe('Agents Credits E2E', () => {
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

  describe('Balance validation', () => {
    it('should reject run when balance is insufficient', async () => {
      const lowCreditCompany = await prisma.company.create({
        data: {
          id: `low_credit_${Date.now()}`,
          name: 'Low Credit Company',
          slug: `low-credit-${Date.now()}`,
          ownerUserId: seedResult.user.id,
        },
      });

      await prisma.creditBalance.create({
        data: {
          companyId: lowCreditCompany.id,
          amount: 0.001,
          currency: 'USD',
        },
      });

      const runsBeforeCount = await prisma.agentRun.count({
        where: { companyId: lowCreditCompany.id },
      });

      const response = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Test post' });

      expect(response.status).toBe(422);

      const runsAfterCount = await prisma.agentRun.count({
        where: { companyId: lowCreditCompany.id },
      });

      expect(runsAfterCount).toBe(runsBeforeCount);
    });
  });

  describe('Run execution with credits', () => {
    it('should create run and debit credits on completion', async () => {
      const mode = getExecutionMode();
      if (mode === 'trigger') {
        console.log('Skipping inline execution test in trigger mode');
        return;
      }

      const beforeSnapshot = await getCreditSnapshot(prisma, seedResult.company.id);

      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Post sobre lançamento de bolo de cenoura' });

      expect(createResponse.status).toBe(201);
      const runId = createResponse.body.runId;
      expect(runId).toBeDefined();

      const result = await executeRunInline(prisma, runId);

      expect(result.status).toBe('COMPLETED');
      expect(result.outputPayload).toHaveProperty('caption');
      expect(result.outputPayload).toHaveProperty('hashtags');

      const run = await prisma.agentRun.findUnique({
        where: { id: runId },
        include: { steps: true },
      });

      expect(run?.status).toBe('COMPLETED');
      expect(run?.steps.length).toBeGreaterThanOrEqual(3);

      const llmStep = run?.steps.find((s) => s.llmModel && s.llmModel !== 'stub');
      if (llmStep) {
        expect(Number(llmStep.creditCost)).toBeGreaterThan(0);
      }

      await assertCreditLedger(prisma, seedResult.company.id, beforeSnapshot, {
        agentRunId: runId,
      });
    });

    it('should persist steps with correct attributes', async () => {
      const mode = getExecutionMode();
      if (mode === 'trigger') return;

      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Test post for steps verification' });

      const runId = createResponse.body.runId;
      await executeRunInline(prisma, runId);

      const steps = await prisma.agentRunStep.findMany({
        where: { agentRunId: runId },
        orderBy: { stepIndex: 'asc' },
      });

      expect(steps.length).toBe(3);
      expect(steps[0].stepKey).toBe('retrieve_context');
      expect(steps[1].stepKey).toBe('generate_caption');
      expect(steps[2].stepKey).toBe('validate_output');

      for (const step of steps) {
        expect(step.status).toBe('COMPLETED');
        expect(step.completedAt).toBeDefined();
      }

      const llmStep = steps.find((s) => s.stepKey === 'generate_caption');
      expect(llmStep?.llmModel).toBeDefined();
    });
  });

  describe('Run cancellation', () => {
    it('should cancel run without additional debits', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Test post for cancellation' });

      const runId = createResponse.body.runId;

      const cancelResponse = await request(app.getHttpServer())
        .post(`/api/agents/runs/${runId}/cancel`)
        .set('Cookie', session.cookies);

      expect([200, 204]).toContain(cancelResponse.status);

      const run = await prisma.agentRun.findUnique({ where: { id: runId } });
      expect(run?.status).toBe('CANCELLED');
    });
  });

  describe('Regenerate run', () => {
    it('should create new run and debit again', async () => {
      const mode = getExecutionMode();
      if (mode === 'trigger') return;

      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Original post' });

      const originalRunId = createResponse.body.runId;
      await executeRunInline(prisma, originalRunId);

      const beforeSnapshot = await getCreditSnapshot(prisma, seedResult.company.id);

      const regenerateResponse = await request(app.getHttpServer())
        .post(`/api/agents/runs/${originalRunId}/regenerate`)
        .set('Cookie', session.cookies)
        .send({});

      expect(regenerateResponse.status).toBe(202);

      const newRunId = regenerateResponse.body.runId;
      expect(newRunId).not.toBe(originalRunId);

      await executeRunInline(prisma, newRunId);

      const afterSnapshot = await getCreditSnapshot(prisma, seedResult.company.id);
      expect(afterSnapshot.balance).toBeLessThan(beforeSnapshot.balance);
    });
  });
});
