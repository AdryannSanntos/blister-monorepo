import { tasks } from '@trigger.dev/sdk';

import type { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

import type { AgentRegistryService } from './agent-registry.service';

import type { AgentSseService } from './agent-sse.service';

import type { CreditStepInterceptor } from './credit-step.interceptor';

import { WorkflowEngineService } from './workflow-engine.service';

jest.mock('@trigger.dev/sdk', () => ({
  tasks: {
    trigger: jest.fn(),
  },
}));

describe('WorkflowEngineService.resumeRun', () => {
  const findUnique = jest.fn();
  const update = jest.fn();

  const prisma = {
    agentRun: { findUnique, update },
  } as unknown as PrismaService;

  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

  const triggerMock = tasks.trigger as jest.Mock;

  let service: WorkflowEngineService;

  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset().mockResolvedValue({});
    triggerMock.mockReset().mockResolvedValue({ id: 'handle-1' });

    service = new WorkflowEngineService(
      prisma,
      {} as unknown as AgentRegistryService,
      {} as unknown as CreditStepInterceptor,
      {} as unknown as AgentSseService,
      config,
    );
  });

  const baseRun = {
    id: 'run-1',
    status: 'PAUSED' as const,
    inputPayload: {},
  };

  it('does not remap await_content_approval (now an active step) for carousel runs', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      agentId: 'carousel',
      currentStepKey: 'await_content_approval',
    });

    await service.resumeRun({ runId: 'run-1' });

    expect(triggerMock).toHaveBeenCalledWith(
      'agent-run-execute',
      expect.objectContaining({ resumeFromStep: 'await_content_approval' }),
    );
  });

  it('remaps a legacy generate_design_plan step to generate_slides for carousel runs', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      agentId: 'carousel',
      currentStepKey: 'generate_design_plan',
    });

    await service.resumeRun({ runId: 'run-1' });

    expect(triggerMock).toHaveBeenCalledWith(
      'agent-run-execute',
      expect.objectContaining({ resumeFromStep: 'generate_slides' }),
    );
  });

  it('remaps a legacy await_design_approval step to generate_slides for carousel runs', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      agentId: 'carousel',
      currentStepKey: 'await_design_approval',
    });

    await service.resumeRun({ runId: 'run-1' });

    expect(triggerMock).toHaveBeenCalledWith(
      'agent-run-execute',
      expect.objectContaining({ resumeFromStep: 'generate_slides' }),
    );
  });

  it('does not remap a current (non-legacy) step key for carousel runs', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      agentId: 'carousel',
      currentStepKey: 'generate_ideas',
    });

    await service.resumeRun({ runId: 'run-1' });

    expect(triggerMock).toHaveBeenCalledWith(
      'agent-run-execute',
      expect.objectContaining({ resumeFromStep: 'generate_ideas' }),
    );
  });

  it('never applies the carousel legacy remap for non-carousel agents, even with a coincidentally matching step key', async () => {
    // `research` runs never actually produce these step keys in practice, but
    // this proves the remap is gated on `agentId === 'carousel'` and not on
    // the step key alone — the exact bug class this test suite exists to catch.
    // (Using `research` rather than `cuts` here to avoid the unrelated
    // `assertCutsLiveProviders` live-provider guard that `cuts` runs trigger.)
    findUnique.mockResolvedValue({
      ...baseRun,
      agentId: 'research',
      currentStepKey: 'await_content_approval',
    });

    await service.resumeRun({ runId: 'run-1' });

    expect(triggerMock).toHaveBeenCalledWith(
      'agent-run-execute',
      expect.objectContaining({ resumeFromStep: 'await_content_approval' }),
    );
  });

  it('returns current status without re-triggering when run is already COMPLETED', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      status: 'COMPLETED',
      agentId: 'carousel',
      currentStepKey: 'await_content_approval',
    });

    const result = await service.resumeRun({ runId: 'run-1' });

    expect(result).toEqual({ runId: 'run-1', status: 'COMPLETED' });
    expect(triggerMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('returns current status without re-triggering when run is already QUEUED', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      status: 'QUEUED',
      agentId: 'carousel',
      currentStepKey: 'await_content_approval',
    });

    const result = await service.resumeRun({ runId: 'run-1' });

    expect(result).toEqual({ runId: 'run-1', status: 'QUEUED' });
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('throws ConflictException when run is FAILED', async () => {
    findUnique.mockResolvedValue({
      ...baseRun,
      status: 'FAILED',
      agentId: 'carousel',
    });

    await expect(service.resumeRun({ runId: 'run-1' })).rejects.toThrow(
      'Run cannot be resumed while FAILED',
    );
    expect(triggerMock).not.toHaveBeenCalled();
  });
});
