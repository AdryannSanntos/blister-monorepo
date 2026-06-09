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
  SseEventCollector,
  assertSseEventSequence,
  assertRunCompletedEvent,
} from './helpers/assert-sse-events';
import { executeRunInline, getExecutionMode } from './setup/inline-executor';
import type { PrismaClient } from '../src/generated/prisma';

describe('SSE Events E2E', () => {
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

  describe('Event sequence', () => {
    it('should emit correct event sequence on successful run', async () => {
      const mode = getExecutionMode();
      if (mode === 'trigger') {
        console.log('Skipping inline execution test in trigger mode');
        return;
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Post para teste de SSE' });

      const runId = createResponse.body.runId;

      const collector = new SseEventCollector(
        `http://localhost:${app.getHttpServer().address().port}`,
        session.cookies,
      );

      collector.addEvent('run_started', { agentId: 'copywriter' });

      const result = await executeRunInline(prisma, runId);

      for (let i = 0; i < result.steps.length; i++) {
        const step = result.steps[i];
        collector.addEvent('step_started', { stepKey: step.stepKey, stepIndex: i });
        collector.addEvent('step_completed', {
          stepKey: step.stepKey,
          stepIndex: i,
          output: step.output,
        });
      }

      collector.addEvent('run_completed', {
        outputPayload: result.outputPayload,
        totalCreditCost: result.creditCost,
      });

      const events = collector.getEvents();

      assertSseEventSequence(events, {
        expectedSequence: [
          'run_started',
          'step_started',
          'step_completed',
          'step_started',
          'step_completed',
          'step_started',
          'step_completed',
          'run_completed',
        ],
        allowExtraEvents: false,
      });

      assertRunCompletedEvent(events, runId);
    });

    it('should emit run_failed on error', async () => {
      const runId = `failed_run_${Date.now()}`;

      await prisma.agentRun.create({
        data: {
          id: runId,
          companyId: seedResult.company.id,
          agentId: 'copywriter',
          status: 'QUEUED',
          inputPayload: { userInput: 'Test' },
        },
      });

      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: 'Test error',
          completedAt: new Date(),
        },
      });

      const collector = new SseEventCollector('', session.cookies);
      collector.addEvent('run_failed', { errorMessage: 'Test error' });

      const events = collector.getEvents();
      const failedEvent = events.find((e) => e.type === 'run_failed');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.data.errorMessage).toBe('Test error');
    });
  });

  describe('Event data consistency', () => {
    it('should match DB state after run_completed', async () => {
      const mode = getExecutionMode();
      if (mode === 'trigger') return;

      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/copywriter/run')
        .set('Cookie', session.cookies)
        .send({ userInput: 'Post para verificação de consistência' });

      const runId = createResponse.body.runId;
      const result = await executeRunInline(prisma, runId);

      const dbRun = await prisma.agentRun.findUnique({
        where: { id: runId },
      });

      expect(dbRun?.status).toBe(result.status);
      expect(dbRun?.outputPayload).toEqual(result.outputPayload);
    });
  });
});
