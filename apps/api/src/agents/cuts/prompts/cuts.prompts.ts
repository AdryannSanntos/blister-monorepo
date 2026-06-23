import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import {
  getCutsProcessingTimeframe,
  getCutsSettings,
  getCutsVideoGenre,
} from '../steps/cuts-steps';

const genrePromptHints: Record<string, string> = {
  podcast: 'Podcast-style conversation: prioritize insightful quotes and debate moments.',
  live: 'Live stream: prioritize reactive, high-energy moments and audience hooks.',
  tutorial: 'Tutorial or class: prioritize clear teaching beats and actionable tips.',
  interview: 'Interview: prioritize revealing answers and emotional turns.',
  vlog: 'Vlog: prioritize personal storytelling and visually descriptive beats.',
  storytelling: 'Storytelling: prioritize narrative arcs, tension, and payoffs.',
  other: 'General long-form video: prioritize universal retention hooks.',
};

export const buildCutsSystemPrompt = (context: StepExecutionContext): string => {
  const settings = getCutsSettings(context);
  const genre = getCutsVideoGenre(context);
  const timeframe = getCutsProcessingTimeframe(context);

  const lines = [
    'You are a short-form video editor who turns long recordings into high-retention clips.',
    `Return up to ${settings.maxCuts} cuts, each around ${settings.cutDurationSec} seconds.`,
    'Required: strong title, description, startSec, endSec, viralScore from 0 to 100.',
    'Use ONLY timestamps that exist in the provided transcript segments — never invent times.',
    'Titles and descriptions must match the spoken language of the transcript.',
    'Order cuts from highest to lowest viralScore.',
  ];

  if (genre) {
    lines.push(`Video genre: ${genre}. ${genrePromptHints[genre] ?? ''}`.trim());
  }

  if (timeframe) {
    lines.push(
      `All cuts MUST fall within ${timeframe.startSec}s–${timeframe.endSec}s of the source video.`,
    );
  }

  return lines.filter(Boolean).join(' ');
};

export const buildCutsUserPrompt = (context: StepExecutionContext): string => {
  const input = context.inputPayload as {
    userInput?: string;
    sourceFileId?: string;
  };
  const settings = getCutsSettings(context);
  const timeframe = getCutsProcessingTimeframe(context);
  const sourceOutput = context.previousStepsOutput.resolve_source as {
    analyzedSegments?: Array<{ startSec: number; endSec: number; text: string }>;
  };

  const segmentLines =
    sourceOutput?.analyzedSegments?.map(
      (segment) => `[${segment.startSec}s-${segment.endSec}s] ${segment.text}`,
    ) ?? [];

  const lines = [
    `User instructions: ${input.userInput ?? ''}`,
    `Source file: ${input.sourceFileId ?? ''}`,
    `Constraints: maxCuts=${settings.maxCuts}, targetDurationSec=${settings.cutDurationSec}`,
  ];

  if (timeframe) {
    lines.push(
      `Processing window: only rank cuts between ${timeframe.startSec}s and ${timeframe.endSec}s.`,
    );
  }

  lines.push('Transcript segments:', ...segmentLines, 'Generate the ranked cut list as JSON.');

  return lines.join('\n');
};
