import type { z } from 'zod';
import type { ClarificationField } from '../clarification/clarification-field';
import type { StepExecutionContext, StepRuntimeDeps } from '../core/types';
import { parseLlmJson } from '../schemas/parse-llm-json';
import {
  baseRequestAnalysisSchema,
  normalizeAnalysisResult,
  type BaseRequestAnalysis,
} from '../schemas/request-analysis';
import type { EnrichmentField } from '../schemas/clarification-answer';
import { zodToJsonSchema } from '../schemas/zod-to-json-schema';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './analysis-prompt';

export interface AnalyzeUserRequestOptions<TSchema extends z.ZodType> {
  analysisSchema: TSchema;
  fields: ClarificationField[];
  enrichments?: EnrichmentField[];
  inputKey?: string;
}

const EMPTY_ANALYSIS = (fields: ClarificationField[]): BaseRequestAnalysis =>
  normalizeAnalysisResult({}, fields) as BaseRequestAnalysis;

/**
 * Runs the request-analysis LLM call and returns a normalized analysis. Falls
 * back to an empty analysis (ask everything) when no LLM is available or the
 * response cannot be parsed — analysis must never crash the run.
 */
export const analyzeUserRequest = async <TSchema extends z.ZodType>(
  context: StepExecutionContext,
  deps: StepRuntimeDeps,
  options: AnalyzeUserRequestOptions<TSchema>,
): Promise<BaseRequestAnalysis & Record<string, unknown>> => {
  const inputKey = options.inputKey ?? 'userInput';
  const userInput = String(
    (context.inputPayload as Record<string, unknown>)[inputKey] ?? '',
  ).trim();

  if (!userInput || !deps.llmProvider) {
    return EMPTY_ANALYSIS(options.fields);
  }

  try {
    const response = await deps.llmProvider.complete({
      system: buildAnalysisSystemPrompt(context, options.fields, options.enrichments ?? []),
      user: buildAnalysisUserPrompt(userInput),
      structuredOutputSchema: zodToJsonSchema(options.analysisSchema),
      maxTokens: 1024,
      temperature: 0.1,
    });

    const parsed = parseLlmJson(response.content, baseRequestAnalysisSchema, {
      repair: (raw) => normalizeAnalysisResult(raw, options.fields),
    });

    if (parsed.success) {
      return parsed.data as BaseRequestAnalysis & Record<string, unknown>;
    }

    return EMPTY_ANALYSIS(options.fields);
  } catch {
    return EMPTY_ANALYSIS(options.fields);
  }
};
