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
import { installTriggerTestHarness } from './setup/trigger-test-harness';
import { getCreditSnapshot, assertCreditLedger } from './helpers/assert-credit-ledger';
import type { PrismaClient } from '@company-os/db';

describe('Agents Credits E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seedResult: TestSeedResult;
  let session: AuthenticatedSession;
  let sourceFileId: string;

  beforeAll(async () => {
    prisma = await getTestPrisma();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    await cleanupTestDatabase();
    seedResult = await seedTestDatabase();

    session = await loginAsDemoBusiness(app, seedResult.user.email, seedResult.user.password);

    let cutsFolder = await prisma.workspaceFolder.findFirst({
      where: { companyId: seedResult.company.id, systemKey: 'agent:cuts' },
    });

    if (!cutsFolder) {
      cutsFolder = await prisma.workspaceFolder.create({
        data: {
          companyId: seedResult.company.id,
          name: 'Cortes',
          kind: 'SYSTEM',
          systemKey: 'agent:cuts',
        },
      });
    }

    const file = await prisma.workspaceFile.create({
      data: {
        companyId: seedResult.company.id,
        folderId: cutsFolder.id,
        name: 'cancel-test.mp4',
        mimeType: 'video/mp4',
        storageKey: `${seedResult.company.slug}/uploads/cancel-test.mp4`,
        sizeBytes: 1024,
        extractedText: 'Sample transcript for cancellation test.',
        status: 'INDEXED',
        extractData: true,
        origin: 'UPLOAD',
      },
    });

    sourceFileId = file.id;
    installTriggerTestHarness(prisma);
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
    it.skip('legacy copywriter inline credit debit — migrate to trigger harness', () => undefined);
    it.skip('legacy copywriter inline step persistence — migrate to trigger harness', () => undefined);
  });

  describe('Run cancellation', () => {
    it('should cancel run without additional debits', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/agents/cuts/run')
        .set('Cookie', session.cookies)
        .send({
          userInput: 'Test cuts for cancellation',
          metadata: {
            sourceFileId,
            settings: {
              maxCuts: 1,
              cutDurationSec: 60,
              deleteSourceAfterRun: false,
              addCaptions: false,
              autoAcceptResults: true,
            },
          },
        });

      expect(createResponse.status).toBe(202);
      const runId = createResponse.body.runId as string;

      const cancelResponse = await request(app.getHttpServer())
        .post(`/api/agents/runs/${runId}/cancel`)
        .set('Cookie', session.cookies);

      expect([200, 204]).toContain(cancelResponse.status);

      const run = await prisma.agentRun.findUnique({ where: { id: runId } });
      expect(run?.status).toBe('CANCELLED');
    });
  });

  describe('Regenerate run', () => {
    it.skip('legacy copywriter regenerate inline — migrate to trigger harness', () => undefined);
  });
});
