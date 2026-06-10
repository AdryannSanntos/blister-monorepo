import type { z } from 'zod';
import type { ClarificationField } from '../clarification/clarification-field';
import { getNextField, resolveConditionalFields } from '../clarification/clarification-flow';
import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';
import {
  mergeAnalysisIntoPayload,
  type BaseRequestAnalysis,
} from '../schemas/request-analysis';
import type { EnrichmentField } from '../schemas/clarification-answer';
import { analyzeUserRequest } from './analyze-request';

export interface AdaptiveBriefOptions<TSchema extends z.ZodType, TBrief> {
  analysisSchema: TSchema;
  fields: ClarificationField[];
  enrichments?: EnrichmentField[];
  buildBrief: (
    answers: Record<string, unknown>,
    analysis: BaseRequestAnalysis,
  ) => TBrief;
  getNextField?: (
    answers: Record<string, unknown>,
    analysis: BaseRequestAnalysis,
  ) => ClarificationField | null;
  inputKey?: string;
  minConfidenceToSkip?: 'high' | 'medium';
  emitThinkingBlock?: boolean;
}

const toOutput = (brief: unknown, analysis: BaseRequestAnalysis): Record<string, unknown> => {
  const base =
    brief && typeof brief === 'object' ? (brief as Record<string, unknown>) : { brief };
  return { ...base, enrichedBrief: analysis.enrichedBrief };
};

/**
 * Analyzes the free-text request, merges high-confidence answers into the
 * payload, then asks only the fields still missing (one pause per field).
 * Once the brief is complete it builds the typed brief and continues.
 */
export const createAdaptiveBriefStep = <TSchema extends z.ZodType, TBrief>(
  options: AdaptiveBriefOptions<TSchema, TBrief>,
): StepExecutor => {
  return async (context: StepExecutionContext, deps): Promise<StepResult> => {
    const analysis = await analyzeUserRequest(context, deps, {
      analysisSchema: options.analysisSchema,
      fields: options.fields,
      enrichments: options.enrichments,
      inputKey: options.inputKey,
    });

    if (options.emitThinkingBlock && analysis.reasoning && deps.message) {
      const thinking = deps.message.thinking();
      thinking.delta(analysis.reasoning);
      await thinking.end();
    }

    const merged = mergeAnalysisIntoPayload(
      context.inputPayload,
      analysis,
      options.minConfidenceToSkip ?? 'high',
    );

    const next = options.getNextField
      ? options.getNextField(merged, analysis)
      : getNextField(merged, options.fields);

    if (next) {
      const pauseFormSchema = { fields: [next] };
      await deps.message?.formQuestion(pauseFormSchema);
      return {
        type: 'PAUSED',
        pauseReason: next.label,
        pauseFormSchema,
      };
    }

    const brief = options.buildBrief(merged, analysis);
    return {
      type: 'CONTINUE',
      output: toOutput(brief, analysis),
    };
  };
};

/**
 * Standalone analysis step: extracts structured fields from the free-text
 * request and returns the analysis without pausing. Useful when analysis and
 * clarification are separate steps.
 */
export const createAnalyzeRequestStep = <TSchema extends z.ZodType>(options: {
  analysisSchema: TSchema;
  fields: ClarificationField[];
  enrichments?: EnrichmentField[];
  inputKey?: string;
}): StepExecutor => {
  return async (context, deps): Promise<StepResult> => {
    const analysis = await analyzeUserRequest(context, deps, options);
    const relevantFields = resolveConditionalFields(context.inputPayload, options.fields);
    return {
      type: 'CONTINUE',
      output: {
        analysis,
        missingFields: analysis.missingFields,
        relevantFieldNames: relevantFields.map((f) => f.name),
      },
    };
  };
};
