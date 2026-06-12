import { cutsLearningHandler } from './feedback-handler';

describe('cutsLearningHandler', () => {
  const output = {
    sourceFileId: 'file-1',
    cuts: [
      {
        id: 'cut-1',
        title: 'Hook',
        description: 'Strong opener',
        startSec: 0,
        endSec: 60,
        durationSec: 60,
        viralScore: 90,
        reviewStatus: 'approved' as const,
      },
      {
        id: 'cut-2',
        title: 'CTA',
        description: 'Call to action',
        startSec: 120,
        endSec: 150,
        durationSec: 30,
        viralScore: 75,
        reviewStatus: 'rejected' as const,
      },
    ],
  };

  it('serializes cut titles, duration and viralScore', () => {
    const markdown = cutsLearningHandler.serialize({
      agentRunId: 'run-1',
      companyId: 'co-1',
      approved: true,
      output,
    });

    expect(markdown).toContain('Hook');
    expect(markdown).toContain('viralScore 90');
    expect(markdown).toContain('approved');
  });

  it('extracts preferred duration from approved cuts', () => {
    const insights = cutsLearningHandler.extractInsights({
      agentRunId: 'run-1',
      companyId: 'co-1',
      approved: true,
      output,
      cutDecisions: [
        { cutId: 'cut-1', decision: 'approve' },
        { cutId: 'cut-2', decision: 'reject' },
      ],
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalType: 'preferred_cut_duration', signalValue: '60' }),
        expect.objectContaining({ signalType: 'preferred_viral_score' }),
      ]),
    );
  });

  it('indexes per-cut decisions in serialize output', () => {
    const markdown = cutsLearningHandler.serialize({
      agentRunId: 'run-1',
      companyId: 'co-1',
      approved: false,
      output,
      cutDecisions: [{ cutId: 'cut-2', decision: 'reject' }],
    });

    expect(markdown).toContain('cut-2: reject');
  });
});
