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
import { AgentExecutionService } from './agent-execution.service';
import { AgentRunsService } from './agent-runs.service';

const makeMockPrisma = () => ({
  companyAgent: { findFirst: jest.fn() },
  agentRun: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  agentVersion: { findFirst: jest.fn() },
  agentRunStep: { create: jest.fn() },
});

describe('AgentRunsService', () => {
  let service: AgentRunsService;
  let executionService: { enqueueRun: jest.Mock; processRun: jest.Mock; storeRunError: jest.Mock };
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    executionService = {
      enqueueRun: jest.fn().mockResolvedValue({ id: 'task-handle-1' }),
      processRun: jest.fn(),
      storeRunError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRunsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentExecutionService, useValue: executionService },
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

    const result = await service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: { topic: 'ops' } });

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

  it('throws when agent is missing during queued run creation', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(service.createQueuedRun('org-1', 'agent-1', 'user-1', { input: {} })).rejects.toThrow(
      NotFoundException,
    );
  });
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

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentExecutionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AIRuntimeService, useValue: aiRuntimeService },
        { provide: CreditsService, useValue: creditsService },
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
      inputPayload: {},
      agentVersion: { flowDefinition: { nodes: [{ id: 'step-1', type: 'llm_generate', config: {} }] } },
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
  });
});
