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
import type { PrismaClient } from '@company-os/db';

const waitForRunStatus = async (
  prisma: PrismaClient,
  runId: string,
  expectedStatuses: string[],
  timeoutMs = 20_000,
) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const run = await prisma.agentRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error(`Run ${runId} not found`);

    if (expectedStatuses.includes(run.status)) {
      return run;
    }

    if (run.status === 'FAILED') {
      throw new Error(run.errorMessage ?? 'Run failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timeout waiting for run ${runId}`);
};

describe('Cuts Agent E2E', () => {
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
        name: 'test-podcast.mp4',
        mimeType: 'video/mp4',
        storageKey: `${seedResult.company.slug}/uploads/test-podcast.mp4`,
        sizeBytes: 1024,
        extractedText:
          'Welcome to the podcast about content creation. Today we discuss hooks that retain viewers.',
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

  it('should start, execute and complete a cuts run', async () => {
    const startResponse = await request(app.getHttpServer())
      .post('/api/agents/cuts/run')
      .set('Cookie', session.cookies)
      .send({
        userInput: 'Generate cuts from podcast',
        metadata: {
          sourceFileId,
          settings: {
            maxCuts: 3,
            cutDurationSec: 60,
            deleteSourceAfterRun: false,
            addCaptions: false,
            autoAcceptResults: true,
          },
        },
      });

    expect(startResponse.status).toBe(202);
    expect(startResponse.body.runId).toBeDefined();

    const runId = startResponse.body.runId as string;
    const run = await waitForRunStatus(prisma, runId, ['COMPLETED']);

    const cuts = (run.outputPayload as { cuts?: Array<{ cutFileId?: string }> }).cuts;
    expect(Array.isArray(cuts)).toBe(true);
    expect(cuts?.length).toBeGreaterThan(0);
    for (const cut of cuts ?? []) {
      expect(cut.cutFileId).toBeDefined();
    }
  });

  it('should pause for review when autoAcceptResults is false', async () => {
    const startResponse = await request(app.getHttpServer())
      .post('/api/agents/cuts/run')
      .set('Cookie', session.cookies)
      .send({
        userInput: 'Generate cuts with review',
        metadata: {
          sourceFileId,
          settings: {
            maxCuts: 2,
            cutDurationSec: 60,
            deleteSourceAfterRun: false,
            addCaptions: false,
            autoAcceptResults: false,
          },
        },
      });

    expect(startResponse.status).toBe(202);
    const runId = startResponse.body.runId as string;

    const pausedRun = await waitForRunStatus(prisma, runId, ['PAUSED']);
    expect(pausedRun.pauseReason).toBe('awaiting_cut_review');

    const cuts = (pausedRun.outputPayload as { cuts: Array<{ id: string }> }).cuts;

    const resumeResponse = await request(app.getHttpServer())
      .post(`/api/agents/runs/${runId}/resume`)
      .set('Cookie', session.cookies)
      .send({
        formData: {
          cutDecisions: cuts.map((cut) => ({ cutId: cut.id, decision: 'approve' })),
        },
      });

    expect(resumeResponse.status).toBe(202);

    const completedRun = await waitForRunStatus(prisma, runId, ['COMPLETED']);
    expect(completedRun.status).toBe('COMPLETED');
  });

  it('should list cuts runs and stats', async () => {
    const runsResponse = await request(app.getHttpServer())
      .get('/api/agents/cuts/runs')
      .set('Cookie', session.cookies);

    expect(runsResponse.status).toBe(200);
    expect(runsResponse.body.total).toBeGreaterThan(0);

    const statsResponse = await request(app.getHttpServer())
      .get('/api/agents/cuts/stats')
      .set('Cookie', session.cookies);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.totalRuns).toBeGreaterThan(0);
  });
});
