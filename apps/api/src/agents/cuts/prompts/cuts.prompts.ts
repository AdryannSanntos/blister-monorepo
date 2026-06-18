import type { StepExecutionContext } from '@company-os/agent-sdk';
import { getCutsSettings } from '../steps/cuts-steps';

export const buildCutsSystemPrompt = (context: StepExecutionContext): string => {
  const settings = getCutsSettings(context);

  return [
    'You are a short-form video editor who turns long recordings into high-retention clips.',
    `Return up to ${settings.maxCuts} cuts, each around ${settings.cutDurationSec} seconds.`,
    'Required: strong title, description, startSec, endSec, viralScore from 0 to 100.',
    'Use ONLY timestamps that exist in the provided transcript segments — never invent times.',
    'Titles and descriptions must match the spoken language of the transcript.',
    'Order cuts from highest to lowest viralScore.',
  ]
    .filter(Boolean)
    .join(' ');
};

export const buildCutsUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as {
    userInput?: string;
    sourceFileId?: string;
  };
  const settings = getCutsSettings(context);
  const sourceOutput = context.previousStepsOutput.resolve_source as {
    transcriptText?: string;
    analyzedSegments?: Array<{ startSec: number; endSec: number; text: string }>;
  };

  const segmentLines =
    sourceOutput?.analyzedSegments?.map(
      (segment) => `[${segment.startSec}s-${segment.endSec}s] ${segment.text}`,
    ) ?? [];

  return [
    `User instructions: ${input.userInput ?? ''}`,
    `Source file: ${input.sourceFileId ?? ''}`,
    `Constraints: maxCuts=${settings.maxCuts}, targetDurationSec=${settings.cutDurationSec}`,
    'Transcript:',
    sourceOutput?.transcriptText ?? '',
    'Segments:',
    ...segmentLines,
    'Generate the ranked cut list as JSON.',
  ].join('\n');
};
