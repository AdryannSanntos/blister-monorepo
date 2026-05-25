import { AgentExecutionService } from './agent-execution.service';

describe('AgentExecutionService', () => {
  const createService = () => {
    const run = {
      id: 'run-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
      status: 'queued',
      attemptCount: 0,
      threadId: 'thread-1',
      inputPayload: { prompt: 'Need details' },
      agentVersion: {
        flowDefinition: {
          nodes: [{ id: 'input-1', type: 'input' }],
          edges: [
            {
              id: 'e1',
              sourceNodeId: 'input-1',
              sourcePortKey: 'payload',
              targetNodeId: 'form-1',
              targetPortKey: 'form_basis',
            },
          ],
        },
      },
    };
    const prisma = {
      agentRun: {
        findFirst: jest.fn().mockResolvedValue(run),
        update: jest.fn().mockResolvedValue({}),
      },
      agentChatMessage: { create: jest.fn().mockResolvedValue({}) },
    };
    const agentQueueService = {
      promoteRun: jest.fn().mockResolvedValue({ ...run, status: 'running' }),
      claimProcessingLease: jest.fn().mockResolvedValue(true),
      createAttemptStep: jest.fn().mockResolvedValue({ id: 'attempt-step-1' }),
      completeAttemptStep: jest.fn().mockResolvedValue({}),
      markRunCompleted: jest.fn().mockResolvedValue({}),
      promoteNextQueuedRun: jest.fn().mockResolvedValue(null),
      releaseProcessingLease: jest.fn().mockResolvedValue({}),
    };
    const workflowRuntime = {
      run: jest.fn().mockResolvedValue({
        visitedBlockIds: ['input-1', 'form-1'],
        suspended: true,
        suspensionId: 'suspension-1',
      }),
    };

    const service = new AgentExecutionService(
      prisma as never,
      {} as never,
      { recordTechnicalCost: jest.fn(), debitRunCredits: jest.fn() } as never,
      {} as never,
      agentQueueService as never,
      workflowRuntime as never,
    );

    return { service, prisma, agentQueueService, workflowRuntime };
  };

  it('keeps suspended graph runs resumable instead of marking them completed', async () => {
    const { service, prisma, agentQueueService } = createService();

    const result = await service.processRun({
      organizationId: 'org-1',
      agentRunId: 'run-1',
      agentId: 'agent-1',
      agentVersionId: 'version-1',
    });

    expect(result).toEqual({
      runId: 'run-1',
      status: 'suspended',
      suspensionId: 'suspension-1',
    });
    expect(agentQueueService.markRunCompleted).not.toHaveBeenCalled();
    expect(prisma.agentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'suspended' }),
      }),
    );
  });
});
