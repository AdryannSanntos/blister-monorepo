jest.mock('@trigger.dev/sdk', () => ({
  tasks: {
    trigger: jest.fn().mockResolvedValue({ id: 'task-handle-1' }),
  },
}));

import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentContextService } from './agent-context.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentQueueService } from './agent-queue.service';
import { AgentRunsService } from './agent-runs.service';
import { AgentWorkflowRuntimeService } from './agent-workflow-runtime.service';
import { HtmlPreviewService } from './html-preview.service';

const makeMockPrisma = () => ({
  companyAgent: { findFirst: jest.fn() },
  agentChatMessage: {
    create: jest.fn(),
  },
  agentRun: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  agentVersion: { findFirst: jest.fn() },
  agentRunStep: { create: jest.fn() },
});

const makeMockQueueService = () => ({
  promoteNextQueuedRun: jest.fn().mockResolvedValue(null),
});

describe('AgentRunsService', () => {
  let service: AgentRunsService;
  let executionService: { enqueueRun: jest.Mock; processRun: jest.Mock; storeRunError: jest.Mock };
  let queueService: ReturnType<typeof makeMockQueueService>;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    executionService = {
      enqueueRun: jest.fn().mockResolvedValue({ id: 'task-handle-1' }),
      processRun: jest.fn(),
      storeRunError: jest.fn(),
    };
    queueService = makeMockQueueService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRunsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentExecutionService, useValue: executionService },
        { provide: AgentQueueService, useValue: queueService },
        {
          provide: AgentContextService,
          useValue: {
            resolveForRun: jest.fn().mockResolvedValue({}),
            persistSnapshot: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AgentRunsService);
  });

  it('creates queued run', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'version-1',
    });
    prisma.agentRun.create.mockResolvedValue({ id: 'run-1', status: 'queued' });

    const result = await service.createQueuedRun('org-1', 'agent-1', 'user-1', {
      input: { topic: 'ops' },
    });

    expect(prisma.agentRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'queued', agentVersionId: 'version-1' }),
    });
    expect(result.id).toBe('run-1');
  });

  it('enqueues Trigger.dev task', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'version-1',
    });
    prisma.agentRun.create.mockResolvedValue({ id: 'run-1', status: 'queued' });
    queueService.promoteNextQueuedRun.mockResolvedValue({ id: 'run-1' });

    await service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: {} });

    expect(executionService.enqueueRun).toHaveBeenCalledWith({
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
    });
  });

  it('filters runs by organization', async () => {
    prisma.agentRun.findMany.mockResolvedValue([]);

    await service.listRuns('org-1', { onlyOwnRuns: false }, 'user-1');

    expect(prisma.agentRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
    );
  });

  it('filters member-visible runs to own runs when required by service policy', async () => {
    prisma.agentRun.findMany.mockResolvedValue([]);

    await service.listRuns('org-1', { onlyOwnRuns: true }, 'user-1');

    expect(prisma.agentRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', createdByUserId: 'user-1' }),
      }),
    );
  });

  it('throws NotFoundException when agent is missing', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(
      service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when agent has no active version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: null,
    });

    await expect(
      service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('sets threadId and sourceMessageId from input payload', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'v-1',
    });
    prisma.agentRun.create.mockResolvedValue({ id: 'run-1', status: 'queued' });

    await service.createQueuedRun('org-1', 'agent-1', 'user-1', {
      input: { threadId: 'thread-1', messageId: 'msg-1' },
    });

    expect(prisma.agentRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ threadId: 'thread-1', sourceMessageId: 'msg-1' }),
    });
  });

  it('sets threadId to null when input.threadId is empty string', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'v-1',
    });
    prisma.agentRun.create.mockResolvedValue({ id: 'run-1', status: 'queued' });

    await service.createQueuedRun('org-1', 'agent-1', 'user-1', {
      input: { threadId: '', messageId: '' },
    });

    expect(prisma.agentRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ threadId: null, sourceMessageId: null }),
    });
  });

  it('stores parent run, parent step, depth, and root run for sub-agent runs', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'v-1',
    });
    prisma.agentRun.findUnique.mockResolvedValue({ id: 'parent-run-1', rootRunId: 'root-run-1' });
    prisma.agentRun.create.mockResolvedValue({ id: 'child-run-1', status: 'queued' });

    await service.createQueuedRun(
      'org-1',
      'agent-1',
      'user-1',
      { input: {} },
      { parentRunId: 'parent-run-1', parentStepId: 'parent-step-1', depth: 2 },
    );

    expect(prisma.agentRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        parentRunId: 'parent-run-1',
        parentStepId: 'parent-step-1',
        rootRunId: 'root-run-1',
        depth: 2,
      }),
    });
  });

  it('resets lease when enqueueRun fails', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      organizationId: 'org-1',
      activeVersionId: 'v-1',
    });
    prisma.agentRun.create.mockResolvedValue({ id: 'run-1', status: 'queued' });
    queueService.promoteNextQueuedRun.mockResolvedValue({ id: 'run-1' });
    executionService.enqueueRun.mockRejectedValue(new Error('trigger.dev offline'));
    prisma.agentRun.update.mockResolvedValue({ id: 'run-1', status: 'queued' });

    await service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: {} });

    expect(prisma.agentRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: 'queued',
        processingLeaseId: null,
        leaseExpiresAt: null,
      }),
    });
  });

  it('scopes listRuns to organization (cross-org isolation)', async () => {
    prisma.agentRun.findMany.mockResolvedValue([]);

    await service.listRuns('org-safe', { onlyOwnRuns: false }, 'user-1');

    expect(prisma.agentRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-safe' }),
      }),
    );
  });
});

const makeMockExecutionQueueService = () => ({
  claimProcessingLease: jest.fn().mockResolvedValue(true),
  createAttemptStep: jest.fn().mockResolvedValue({ id: 'step-1' }),
  completeAttemptStep: jest.fn().mockResolvedValue(undefined),
  markRunCompleted: jest.fn().mockResolvedValue(undefined),
  promoteNextQueuedRun: jest.fn().mockResolvedValue(null),
  releaseProcessingLease: jest.fn().mockResolvedValue(undefined),
  promoteRun: jest.fn().mockResolvedValue(null),
});

describe('AgentExecutionService', () => {
  let service: AgentExecutionService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  const aiRuntimeService = {
    generateText: jest.fn(),
    generateImage: jest.fn(),
  };
  const creditsService = {
    recordTechnicalCost: jest.fn(),
    debitRunCredits: jest.fn(),
  };
  let execQueueService: ReturnType<typeof makeMockExecutionQueueService>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    execQueueService = makeMockExecutionQueueService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentExecutionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AIRuntimeService, useValue: aiRuntimeService },
        { provide: CreditsService, useValue: creditsService },
        { provide: HtmlPreviewService, useValue: { generateHtmlPreview: jest.fn() } },
        { provide: AgentQueueService, useValue: execQueueService },
        {
          provide: AgentWorkflowRuntimeService,
          useValue: { run: jest.fn().mockResolvedValue({ visitedBlockIds: [] }) },
        },
      ],
    }).compile();

    service = module.get(AgentExecutionService);
  });

  it('stores run error when execution fails', async () => {
    prisma.agentRun.findFirst.mockResolvedValue({
      id: 'run-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
      threadId: 'thread-1',
      status: 'running',
      attemptCount: 2, // skip retry logic → goes straight to storeRunError
      inputPayload: {},
      agentVersion: {
        flowDefinition: { nodes: [{ id: 'step-1', type: 'llm_generate', config: {} }] },
      },
    });
    prisma.agentRun.update.mockResolvedValue({ id: 'run-1' });
    aiRuntimeService.generateText.mockRejectedValue(new Error('provider down'));

    await expect(
      service.processRun({
        organizationId: 'org-1',
        agentRunId: 'run-1',
        agentId: 'agent-1',
        agentVersionId: 'version-1',
      }),
    ).rejects.toThrow('provider down');

    expect(prisma.agentRun.update).toHaveBeenLastCalledWith({
      where: { id: 'run-1' },
      data: { status: 'error', errorMessage: 'provider down' },
    });
    expect(prisma.agentChatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        threadId: 'thread-1',
        agentRunId: 'run-1',
        role: 'assistant',
      }),
    });
  });

  it('persists assistant reply when execution succeeds', async () => {
    prisma.agentRun.findFirst.mockResolvedValue({
      id: 'run-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
      threadId: 'thread-1',
      status: 'running',
      attemptCount: 2,
      inputPayload: { message: 'teste' },
      agentVersion: {
        flowDefinition: {
          nodes: [
            { id: 'input', type: 'input' },
            { id: 'step-1', type: 'llm_generate', config: { prompt: 'Escreva' } },
            { id: 'output', type: 'output' },
          ],
        },
      },
    });
    prisma.agentRun.update.mockResolvedValue({ id: 'run-1' });
    aiRuntimeService.generateText.mockResolvedValue({
      text: 'Copy final',
      usage: { totalTokens: 100 },
      providerId: 'provider-1',
      modelId: 'model-1',
    });

    await service.processRun({
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
    });

    expect(prisma.agentChatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        threadId: 'thread-1',
        agentRunId: 'run-1',
        role: 'assistant',
        content: 'Copy final',
      }),
    });
  });
});
