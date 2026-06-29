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
  timeoutMs = 30_000,
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

describe('Carousel Agent E2E', () => {
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
    app.setGlobalPrefix('api');
    await app.init();

    await cleanupTestDatabase();
    seedResult = await seedTestDatabase();
    session = await loginAsDemoBusiness(app, seedResult.user.email, seedResult.user.password);
    installTriggerTestHarness(prisma);
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDatabase();
  });

  it('lists carousel templates for workspace', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/agents/carousel/templates')
      .set('Cookie', session.cookies);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.templates)).toBe(true);
    expect(
      response.body.templates.some((t: { id: string }) => t.id === 'editorial-performance'),
    ).toBe(true);
  });

  it('pauses at idea selection then completes after approvals', async () => {
    const startResponse = await request(app.getHttpServer())
      .post('/api/agents/carousel/run')
      .set('Cookie', session.cookies)
      .send({
        userInput: {
          theme: 'Produtividade matinal',
          templateId: 'editorial-performance',
          socialNetworks: ['instagram'],
          slidesCount: 5,
        },
      });

    expect(startResponse.status).toBe(202);
    const runId = startResponse.body.runId as string;

    const paused = await waitForRunStatus(prisma, runId, ['PAUSED']);
    expect(paused.pauseReason).toBe('awaiting_idea_selection');

    await request(app.getHttpServer())
      .post(`/api/agents/runs/${runId}/resume`)
      .set('Cookie', session.cookies)
      .send({ formData: { selectedIdeaId: 'idea_1' } })
      .expect(202);

    await waitForRunStatus(prisma, runId, ['PAUSED']);
    const contentPause = await prisma.agentRun.findUnique({ where: { id: runId } });
    expect(contentPause?.pauseReason).toBe('awaiting_content_approval');

    await request(app.getHttpServer())
      .post(`/api/agents/runs/${runId}/resume`)
      .set('Cookie', session.cookies)
      .send({ formData: { contentApproved: true } })
      .expect(202);

    await waitForRunStatus(prisma, runId, ['PAUSED']);
    const designPause = await prisma.agentRun.findUnique({ where: { id: runId } });
    expect(designPause?.pauseReason).toBe('awaiting_design_approval');

    await request(app.getHttpServer())
      .post(`/api/agents/runs/${runId}/resume`)
      .set('Cookie', session.cookies)
      .send({
        formData: {
          designApproved: true,
          imageUploads: {
            'slide_1:image_url': 'stub-file-id',
          },
        },
      })
      .expect(202);

    const completed = await waitForRunStatus(prisma, runId, ['COMPLETED']);
    const output = completed.outputPayload as { slides?: Array<{ pngFileId?: string }> };
    expect(Array.isArray(output.slides)).toBe(true);
    expect(output.slides?.length).toBeGreaterThan(0);
  });
});
