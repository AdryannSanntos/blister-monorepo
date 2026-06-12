import { AgentTestHarness } from '@company-os/agent-sdk/testing';
import { cutsAgent } from './agent';
import {
  createStubCutsRunDeps,
  resetCutsRunDeps,
  setCutsRunDeps,
} from './ports/cuts-run-deps';

const baseInput = {
  userInput: 'Generate viral cuts from my podcast episode',
  sourceFileId: 'file-valid-1',
  settings: {
    maxCuts: 3,
    cutDurationSec: 60,
    deleteSourceAfterRun: false,
    addCaptions: false,
    autoAcceptResults: true,
  },
};

const mockLlmCuts = {
  cuts: [
    {
      id: 'cut-1',
      title: 'Controversial hook',
      description: 'Opens with a polarizing question',
      startSec: 120,
      endSec: 180,
      viralScore: 92,
    },
    {
      id: 'cut-2',
      title: 'Social proof moment',
      description: 'Student testimonial with strong emotion',
      startSec: 240,
      endSec: 300,
      viralScore: 85,
    },
  ],
};

describe('cuts agent', () => {
  beforeEach(() => {
    resetCutsRunDeps();
    setCutsRunDeps(createStubCutsRunDeps());
  });

  it('completes run with autoAcceptResults true', async () => {
    const harness = AgentTestHarness.forAgent(cutsAgent).withLlmResponses({
      rank_segments: mockLlmCuts,
    });

    const result = await harness.run({ ...baseInput });

    expect(result.status).toBe('COMPLETED');
    expect(result.output?.cuts).toHaveLength(2);
    for (const cut of result.output?.cuts as Array<Record<string, unknown>>) {
      expect(cut).toHaveProperty('startSec');
      expect(cut).toHaveProperty('endSec');
      expect(cut).toHaveProperty('viralScore');
      expect(cut.reviewStatus).toBe('approved');
    }
  });

  it('pauses at await_cut_review when autoAcceptResults is false', async () => {
    const harness = AgentTestHarness.forAgent(cutsAgent).withLlmResponses({
      rank_segments: mockLlmCuts,
    });

    const result = await harness.run({
      ...baseInput,
      settings: { ...baseInput.settings, autoAcceptResults: false },
    });

    expect(result.status).toBe('PAUSED');
    expect(result.pauseReason).toBe('awaiting_cut_review');
  });

  it('reflects approve/reject decisions after resume', async () => {
    const harness = AgentTestHarness.forAgent(cutsAgent).withLlmResponses({
      rank_segments: mockLlmCuts,
    });

    await harness.run({
      ...baseInput,
      settings: { ...baseInput.settings, autoAcceptResults: false },
    });

    const resumed = await harness.resume({
      cutDecisions: [
        { cutId: 'cut-1', decision: 'approve' },
        { cutId: 'cut-2', decision: 'reject' },
      ],
    }).run();

    expect(resumed.status).toBe('COMPLETED');
    const cuts = resumed.output?.cuts as Array<{ id: string; reviewStatus: string }>;
    expect(cuts.find((cut) => cut.id === 'cut-1')?.reviewStatus).toBe('approved');
    expect(cuts.find((cut) => cut.id === 'cut-2')?.reviewStatus).toBe('rejected');
  });

  it('fails resolve_source for invalid sourceFileId', async () => {
    const harness = AgentTestHarness.forAgent(cutsAgent);

    const result = await harness.run({
      ...baseInput,
      sourceFileId: 'invalid-file',
    });

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toMatch(/source file/i);
  });

  it('calls delete adapter when deleteSourceAfterRun is true', async () => {
    const deleteSourceFile = jest.fn().mockResolvedValue(undefined);
    setCutsRunDeps(createStubCutsRunDeps({ deleteSourceFile }));

    const harness = AgentTestHarness.forAgent(cutsAgent).withLlmResponses({
      rank_segments: mockLlmCuts,
    });

    await harness.run({
      ...baseInput,
      settings: { ...baseInput.settings, deleteSourceAfterRun: true },
    });

    expect(deleteSourceFile).toHaveBeenCalledWith({
      sourceFileId: 'file-valid-1',
      companyId: 'harness_company',
    });
  });
});
