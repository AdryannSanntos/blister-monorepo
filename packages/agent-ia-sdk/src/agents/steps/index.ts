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

/**
 * Context handed to `buildUser` on each attempt. On the first attempt
 * `previousError` is undefined; on retries it carries the reason the prior
 * attempt was rejected (parse failure, provider error, or a `transformOutput`
 * throw) so the prompt can steer the model to correct its previous output.
 */
export interface LlmRetryContext {
  attempt: number;
  previousError?: string;
}

export const createLlmCallStep = <TSchema extends z.ZodType>(options: {
  outputSchema: TSchema;
  buildSystem: (context: StepExecutionContext) => string;
  buildUser: (context: StepExecutionContext, retry?: LlmRetryContext) => string;
  maxTokens?: number;
  temperature?: number;
  retry?: RetryPolicy;
  cache?: CacheConfig;
  repair?: (raw: unknown) => unknown;
  transformOutput?: (
    data: z.infer<TSchema>,
    context: StepExecutionContext,
  ) => Record<string, unknown>;
  /**
   * Last-resort recovery invoked once every attempt is exhausted, instead of
   * returning FAILED. Receives the final error and the most recent successfully
   * parsed data (before `transformOutput`), letting the step salvage a usable
   * output (e.g. pad an under-delivered slide list) so the run completes rather
   * than crashing. Return `undefined` to keep the FAILED result.
   */
  fallbackOnExhausted?: (
    context: StepExecutionContext,
    info: { error: string; lastData?: z.infer<TSchema> },
  ) => Record<string, unknown> | undefined;
}): StepExecutor => {
  const retry: RetryPolicy = options.retry ?? { maxAttempts: 1 };
  const retryOn = retry.retryOn ?? ['parse_error', 'rate_limit', 'provider_error'];
  const maxAttempts = Math.max(1, retry.maxAttempts);

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

    const system = options.buildSystem(context);
    const structuredOutputSchema = zodToJsonSchema(options.outputSchema);

    let lastError = 'LLM response failed schema validation';
    let lastData: z.infer<TSchema> | undefined;
    let previousError: string | undefined;

    const backoff = (attempt: number): Promise<void> =>
      sleep(retry.backoff === 'exponential' ? (retry.baseDelayMs ?? 0) * 2 ** (attempt - 1) : 0);

    // Called once every attempt has been used up: hand the caller a chance to
    // salvage a usable output before we surface a hard failure that would kill
    // the whole run.
    const giveUp = (): StepResult => {
      if (options.fallbackOnExhausted) {
        const salvaged = options.fallbackOnExhausted(context, { error: lastError, lastData });
        if (salvaged) {
          return { type: 'CONTINUE', output: salvaged };
        }
      }
      return { type: 'FAILED', error: lastError };
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      // Rebuild the user prompt per attempt so retries can carry corrective
      // feedback about why the previous attempt was rejected.
      const llmParams = {
        system,
        user: options.buildUser(context, { attempt, previousError }),
        structuredOutputSchema,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      };

      let response: Awaited<ReturnType<typeof deps.llmProvider.complete>>;
      try {
        response = await deps.llmProvider.complete(llmParams);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Provider error';
        previousError = lastError;
        const reason = isRateLimitError(error) ? 'rate_limit' : 'provider_error';
        if (attempt < maxAttempts && retryOn.includes(reason)) {
          await backoff(attempt);
          continue;
        }
        return giveUp();
      }

      const parsed = parseLlmJson(response.content, options.outputSchema, {
        repair: options.repair,
      });

      if (parsed.success) {
        lastData = parsed.data;
        let output: Record<string, unknown>;
        try {
          output = options.transformOutput
            ? options.transformOutput(parsed.data, context)
            : (parsed.data as Record<string, unknown>);
        } catch (error) {
          // transformOutput validates/reshapes the LLM's own output (e.g. slide
          // count, schema-adjacent invariants) — a throw here means the response
          // was structurally valid JSON but semantically wrong, same class of
          // problem as a parse_error, so it should be retried the same way
          // instead of failing the whole run on the first bad generation.
          lastError = error instanceof Error ? error.message : 'transformOutput failed';
          previousError = lastError;
          if (attempt < maxAttempts && retryOn.includes('parse_error')) {
            await backoff(attempt);
            continue;
          }
          return giveUp();
        }

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
      previousError = lastError;
      if (attempt < maxAttempts && retryOn.includes('parse_error')) {
        await backoff(attempt);
        continue;
      }
      return giveUp();
    }

    return giveUp();
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
