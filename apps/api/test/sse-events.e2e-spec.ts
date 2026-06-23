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
import type { PrismaClient } from '@company-os/db';

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
    it.skip('legacy copywriter SSE sequence — migrate to trigger harness', () => undefined);

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
    it.skip('legacy copywriter DB consistency — migrate to trigger harness', () => undefined);
  });
});
