import type { z } from 'zod';
import type { ClarificationField } from '../clarification/clarification-field';
import { getNextField } from '../clarification/clarification-flow';
import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';
import { parseLlmJson } from '../schemas/parse-llm-json';
import { validateStepOutput } from '../schemas/validate-step-output';
import { zodToJsonSchema } from '../schemas/zod-to-json-schema';
import type { CacheConfig, RetryPolicy } from './cache';
import { sleep } from './cache';

export { createImageGenerationStep } from './create-image-generation-step';
export {
  createPauseStep,
  type CreatePauseStepOptions,
  type PauseType,
  type PreviewBlock,
} from './create-pause-step';
export {
  createInMemoryCacheProvider,
  type CacheConfig,
  type CacheProvider,
  type RetryPolicy,
  type RetryReason,
} from './cache';

const mergePreviousOutputs = (
  previousStepsOutput: Record<string, Record<string, unknown>>,
  sourceStepKeys?: string[],
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  const entries = sourceStepKeys
    ? sourceStepKeys
        .map((key) => previousStepsOutput[key])
        .filter((output): output is Record<string, unknown> => Boolean(output))
    : Object.values(previousStepsOutput);

  for (const output of entries) {
    Object.assign(merged, output);
  }

  return merged;
};

export const createValidationStep = (options: {
  schema: z.ZodType;
  sourceStepKeys?: string[];
}): StepExecutor => {
  return async (context): Promise<StepResult> => {
    const mergedOutput = mergePreviousOutputs(context.previousStepsOutput, options.sourceStepKeys);
    const validated = validateStepOutput(options.schema, mergedOutput);

    if (!validated.success) {
      return {
        type: 'FAILED',
        error: 'Step output validation failed',
      };
    }

    return {
      type: 'CONTINUE',
      output: validated.data as Record<string, unknown>,
    };
  };
};

const isRateLimitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('rate limit') || message.includes('429') || message.includes('too many requests');
};

export const createLlmCallStep = <TSchema extends z.ZodType>(options: {
  outputSchema: TSchema;
  buildSystem: (context: StepExecutionContext) => string;
  buildUser: (context: StepExecutionContext) => string;
  maxTokens?: number;
  temperature?: number;
  retry?: RetryPolicy;
  cache?: CacheConfig;
  repair?: (raw: unknown) => unknown;
  transformOutput?: (
    data: z.infer<TSchema>,
    context: StepExecutionContext,
  ) => Record<string, unknown>;
}): StepExecutor => {
  const retry: RetryPolicy = options.retry ?? { maxAttempts: 1 };
  const retryOn = retry.retryOn ?? ['parse_error', 'rate_limit', 'provider_error'];

  return async (context, deps): Promise<StepResult> => {
    if (!deps.llmProvider) {
      return {
        type: 'FAILED',
        error: 'LLM provider is required for llm_call steps',
      };
    }

    const cacheKey = options.cache?.cacheKey(context);
    if (options.cache && cacheKey) {
      const cached = await options.cache.provider.get(cacheKey);
      if (cached) {
        return { type: 'CONTINUE', output: cached };
      }
    }

    const llmParams = {
      system: options.buildSystem(context),
      user: options.buildUser(context),
      structuredOutputSchema: zodToJsonSchema(options.outputSchema),
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    };

    let lastError = 'LLM response failed schema validation';

    for (let attempt = 1; attempt <= Math.max(1, retry.maxAttempts); attempt += 1) {
      let response: Awaited<ReturnType<typeof deps.llmProvider.complete>>;
      try {
        response = await deps.llmProvider.complete(llmParams);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Provider error';
        const reason = isRateLimitError(error) ? 'rate_limit' : 'provider_error';
        if (attempt < retry.maxAttempts && retryOn.includes(reason)) {
          await sleep(retry.backoff === 'exponential' ? (retry.baseDelayMs ?? 0) * 2 ** (attempt - 1) : 0);
          continue;
        }
        return { type: 'FAILED', error: lastError };
      }

      const parsed = parseLlmJson(response.content, options.outputSchema, {
        repair: options.repair,
      });

      if (parsed.success) {
        const output = options.transformOutput
          ? options.transformOutput(parsed.data, context)
          : (parsed.data as Record<string, unknown>);

        if (options.cache && cacheKey) {
          await options.cache.provider.set(cacheKey, output);
        }

        return {
          type: 'CONTINUE',
          output,
          llmModel: response.model,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          creditCost: response.costUsd,
        };
      }

      lastError = parsed.error ?? lastError;
      if (attempt < retry.maxAttempts && retryOn.includes('parse_error')) {
        await sleep(retry.backoff === 'exponential' ? (retry.baseDelayMs ?? 0) * 2 ** (attempt - 1) : 0);
        continue;
      }
      return { type: 'FAILED', error: lastError };
    }

    return { type: 'FAILED', error: lastError };
  };
};

/**
 * Human-in-the-loop brief collection without LLM analysis: asks the next
 * missing field (one pause per field), then builds the typed brief.
 */
export const createClarificationStep = <TBrief>(options: {
  fields: ClarificationField[];
  buildBrief: (answers: Record<string, unknown>) => TBrief;
}): StepExecutor => {
  return async (context, deps): Promise<StepResult> => {
    const answers = context.inputPayload;
    const next = getNextField(answers, options.fields);

    if (next) {
      const pauseFormSchema = { fields: [next] };
      await deps.message?.formQuestion(pauseFormSchema);
      return { type: 'PAUSED', pauseReason: next.label, pauseFormSchema };
    }

    const brief = options.buildBrief(answers);
    const output =
      brief && typeof brief === 'object'
        ? (brief as Record<string, unknown>)
        : { brief };
    return { type: 'CONTINUE', output };
  };
};

/** Final step that returns the merged outputs of all previous steps. */
export const createOutputStep = (): StepExecutor => {
  return async (context): Promise<StepResult> => {
    const merged: Record<string, unknown> = {};
    for (const output of Object.values(context.previousStepsOutput)) {
      Object.assign(merged, output);
    }
    return { type: 'CONTINUE', output: merged };
  };
};

export const createRetrieveContextStep = (): StepExecutor => {
  return async (): Promise<StepResult> => {
    return {
      type: 'CONTINUE',
      output: {
        contextRetrieved: false,
        chunksCount: 0,
      },
    };
  };
};
