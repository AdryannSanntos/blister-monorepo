import type { LearningHandler } from '@company-os/agent-ia-sdk/agents';
import type { CutOutput, CutsOutput } from '../schemas/output.schema';

export type CutsFeedback = {
  agentRunId: string;
  companyId: string;
  approved: boolean;
  output: CutsOutput;
  userFeedback?: string;
  cutDecisions?: Array<{ cutId: string; decision: 'approve' | 'reject' }>;
};

export type CutsInsights = {
  signalType: string;
  signalValue: string;
  weight: number;
}[];

/**
 * Serializes cuts feedback into a markdown note indexed in RAG as
 * AGENT_LEARNING, so future runs learn preferred cut duration and hooks.
 */
export const cutsLearningHandler: LearningHandler<CutsFeedback, CutsInsights> = {
  serialize: (feedback) => {
    const lines = [
      '# Cuts Generator Learning',
      `Approved: ${feedback.approved ? 'yes' : 'no'}`,
      `Cuts: ${feedback.output.cuts.length}`,
    ];

    for (const cut of feedback.output.cuts) {
      lines.push(
        `- "${cut.title}" (${cut.durationSec}s, viralScore ${cut.viralScore}, ${cut.reviewStatus})`,
      );
    }

    if (feedback.cutDecisions?.length) {
      lines.push('Per-cut decisions:');
      for (const decision of feedback.cutDecisions) {
        lines.push(`- ${decision.cutId}: ${decision.decision}`);
      }
    }

    if (feedback.userFeedback) {
      lines.push(`User feedback: ${feedback.userFeedback}`);
    }

    return lines.join('\n');
  },
  extractInsights: (feedback) => {
    const approvedCuts = feedback.output.cuts.filter(
      (cut: CutOutput) => cut.reviewStatus === 'approved',
    );
    const sourceCuts = approvedCuts.length > 0 ? approvedCuts : feedback.output.cuts;

    const durations = sourceCuts.map((cut: CutOutput) => cut.durationSec);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length
        : 0;

    const avgViralScore =
      sourceCuts.length > 0
        ? sourceCuts.reduce((sum: number, cut: CutOutput) => sum + cut.viralScore, 0) /
          sourceCuts.length
        : 0;

    return [
      {
        signalType: 'preferred_cut_duration',
        signalValue: String(Math.round(avgDuration)),
        weight: feedback.approved ? 1 : 0.25,
      },
      {
        signalType: 'preferred_viral_score',
        signalValue: String(Math.round(avgViralScore)),
        weight: feedback.approved ? 0.8 : 0.2,
      },
    ];
  },
};
