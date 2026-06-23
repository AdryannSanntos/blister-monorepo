import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import { buildCutsUserPrompt } from './cuts.prompts';

const buildContext = (
  overrides: Partial<StepExecutionContext> & {
    resolveSource?: Record<string, unknown>;
  } = {},
): StepExecutionContext =>
  ({
    inputPayload: {
      sourceFileId: 'file-1',
      settings: { maxCuts: 5, cutDurationSec: 60 },
      ...((overrides.inputPayload as object) ?? {}),
    },
    previousStepsOutput: {
      resolve_source: {
        transcriptText: 'full transcript should not appear in prompt',
        analyzedSegments: [
          { startSec: 0, endSec: 30, text: 'Hello world' },
          { startSec: 30, endSec: 60, text: 'Second segment' },
        ],
        ...(overrides.resolveSource ?? {}),
      },
    },
    ...overrides,
  }) as StepExecutionContext;

describe('buildCutsUserPrompt', () => {
  it('includes timed segments without duplicating the full transcript text', () => {
    const prompt = buildCutsUserPrompt(buildContext());

    expect(prompt).toContain('[0s-30s] Hello world');
    expect(prompt).toContain('[30s-60s] Second segment');
    expect(prompt).not.toContain('full transcript should not appear in prompt');
    expect(prompt).not.toMatch(/\bSegments:\s*\n\s*Transcript:/);
  });
});
