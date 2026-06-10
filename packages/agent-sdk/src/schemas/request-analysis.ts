import { z } from 'zod';
import { clarificationFieldSchema, type ClarificationField } from '../clarification/clarification-field';

/** Per-field extraction with the evidence and confidence the LLM reported. */
export const extractedFieldSchema = z.object({
  value: z.unknown(),
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.string(),
});

export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const suggestedPathSchema = z.enum(['quick', 'full', 'clarify']);
export type SuggestedPath = z.infer<typeof suggestedPathSchema>;

/**
 * Base contract every agent's request analysis inherits. Agents extend it with
 * their own structured fields via {@link defineRequestAnalysisSchema}.
 */
export const baseRequestAnalysisSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()),
  suggestedPath: suggestedPathSchema,
  reasoning: z.string(),
  extracted: z.record(z.string(), extractedFieldSchema),
  skippedFieldNames: z.array(z.string()),
  enrichedBrief: z.record(z.string(), z.unknown()),
  dynamicQuestions: z.array(clarificationFieldSchema).optional(),
});

export type BaseRequestAnalysis = z.infer<typeof baseRequestAnalysisSchema>;

/** Factory: build an agent-specific analysis schema on top of the base. */
export const defineRequestAnalysisSchema = <T extends z.ZodRawShape>(extension: T) =>
  baseRequestAnalysisSchema.extend(extension);

export type AgentRequestAnalysis<T extends z.ZodRawShape> = z.infer<
  ReturnType<typeof defineRequestAnalysisSchema<T>>
>;

const CONFIDENCE_RANK: Record<'high' | 'medium' | 'low', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Coerces a raw LLM analysis into a consistent shape: defaults the base fields,
 * and keeps `missingFields`/`skippedFieldNames`/`extracted` in sync so callers
 * never have to reconcile them manually.
 */
export const normalizeAnalysisResult = (
  raw: unknown,
  fields: ClarificationField[],
): BaseRequestAnalysis & Record<string, unknown> => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const extracted =
    source.extracted && typeof source.extracted === 'object'
      ? (source.extracted as Record<string, ExtractedField>)
      : {};

  const extractedNames = Object.keys(extracted);
  const requiredNames = fields.filter((f) => f.required !== false).map((f) => f.name);
  const missingFields = requiredNames.filter((name) => !extractedNames.includes(name));
  const skippedFieldNames = requiredNames.filter((name) => extractedNames.includes(name));

  return {
    ...source,
    intent: typeof source.intent === 'string' ? source.intent : '',
    confidence: typeof source.confidence === 'number' ? source.confidence : 0,
    reasoning: typeof source.reasoning === 'string' ? source.reasoning : '',
    suggestedPath: suggestedPathSchema.safeParse(source.suggestedPath).success
      ? (source.suggestedPath as SuggestedPath)
      : missingFields.length === 0
        ? 'quick'
        : 'clarify',
    extracted,
    missingFields,
    skippedFieldNames,
    enrichedBrief:
      source.enrichedBrief && typeof source.enrichedBrief === 'object'
        ? (source.enrichedBrief as Record<string, unknown>)
        : {},
  };
};

/**
 * Merges extracted high-confidence values into the run payload so the
 * clarification step skips fields the user already answered in free text.
 */
export const mergeAnalysisIntoPayload = (
  payload: Record<string, unknown>,
  analysis: BaseRequestAnalysis,
  minConfidence: 'high' | 'medium' = 'high',
): Record<string, unknown> => {
  const threshold = CONFIDENCE_RANK[minConfidence];
  const merged: Record<string, unknown> = { ...payload };

  for (const [name, field] of Object.entries(analysis.extracted)) {
    if (merged[name] !== undefined && merged[name] !== null && merged[name] !== '') continue;
    if (CONFIDENCE_RANK[field.confidence] >= threshold && field.value !== undefined) {
      merged[name] = field.value;
    }
  }

  return merged;
};

/** Whether a field still needs to be asked given the analysis and answers. */
export const shouldAskField = (
  field: ClarificationField,
  analysis: BaseRequestAnalysis,
  answers: Record<string, unknown>,
): boolean => {
  if (analysis.skippedFieldNames.includes(field.name)) return false;
  const value = answers[field.name];
  if (typeof value === 'string') return value.trim().length === 0;
  return value === undefined || value === null;
};

/** Removes fields the analysis already resolved from the pending question list. */
export const filterFieldsByAnalysis = (
  fields: ClarificationField[],
  analysis: BaseRequestAnalysis,
): ClarificationField[] => fields.filter((field) => !analysis.skippedFieldNames.includes(field.name));
