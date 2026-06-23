import {
  createLlmCallStep,
  parseLlmJson,
  zodToJsonSchema,
  type StepExecutionContext,
  type StepExecutor,
} from '@company-os/agent-ia-sdk/agents';
import { calculateModelCost, type AgentIaSdk } from '@company-os/agent-ia-sdk';
import type { PrismaClient } from '@company-os/db';
import { normalizeCut, cutsLlmOutputZod } from '../schemas/output.schema';
import { buildCutsSystemPrompt, buildCutsUserPrompt } from '../prompts/cuts.prompts';
import {
  createCutsDevTimer,
  errorCutsDev,
  logCutsDev,
  summarizeCuts,
} from '../cuts-dev-logger';
import { getCutsRunDeps } from '../ports/cuts-run-deps';
import { getCutsSettings } from './cuts-steps';
import { resolveCutsRankModel } from '../services/resolve-cuts-model-tier';

const buildRankOutput = (
  data: ReturnType<typeof cutsLlmOutputZod.parse>,
  context: StepExecutionContext,
) => {
  const input = context.inputPayload as {
    sourceFileId?: string;
    settings?: { captionStyleId?: string; autoAcceptResults?: boolean };
  };
  const settings = getCutsSettings(context);
  const normalized = data.cuts.map((cut, index) =>
    normalizeCut(
      { ...cut, id: `cut-${index + 1}` },
      settings.autoAcceptResults ? 'approved' : 'pending',
    ),
  );
  return {
    cuts: normalized,
    sourceFileId: input.sourceFileId ?? '',
    captionStyleId: settings.addCaptions ? settings.captionStyleId : undefined,
  };
};

const rankLlmOptions = {
  outputSchema: cutsLlmOutputZod,
  buildSystem: buildCutsSystemPrompt,
  buildUser: buildCutsUserPrompt,
  transformOutput: buildRankOutput,
};

const fallbackRankStep = createLlmCallStep(rankLlmOptions);

export const createRankSegmentsStep = (): StepExecutor => {
  return async (context, deps) => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();
    const settings = getCutsSettings(context);

    logCutsDev(stepKey, 'Starting segment ranking', {
      runId: context.runId,
      modelTier: settings.modelTier,
      maxCuts: settings.maxCuts,
      cutDurationSec: settings.cutDurationSec,
      addCaptions: settings.addCaptions,
    });

    let cutsDeps;
    try {
      cutsDeps = getCutsRunDeps();
    } catch {
      logCutsDev(stepKey, 'Using fallback LLM step (no cuts deps)', { runId: context.runId });
      return fallbackRankStep(context, deps);
    }

    if (!cutsDeps.completeRankSegments) {
      logCutsDev(stepKey, 'Using fallback LLM step (no completeRankSegments)', {
        runId: context.runId,
      });
      return fallbackRankStep(context, deps);
    }

    const result = await cutsDeps.completeRankSegments(context, deps);

    if (result.type === 'FAILED') {
      errorCutsDev(stepKey, 'Segment ranking failed', undefined, {
        runId: context.runId,
        error: result.error,
        elapsedMs: elapsed(),
      });
      return result;
    }

    const cuts = (result.output as { cuts?: Array<{ id: string; title: string; startSec: number; endSec: number }> })?.cuts ?? [];

    logCutsDev(stepKey, 'Segment ranking completed', {
      runId: context.runId,
      ...summarizeCuts(cuts),
      llmModel: result.llmModel,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      creditCost: result.creditCost,
      elapsedMs: elapsed(),
    });

    return result;
  };
};

export const createProductionRankSegmentsExecutor = (
  prisma: PrismaClient,
  sdk: AgentIaSdk,
): NonNullable<
  import('../ports/cuts-run-deps').CutsRunDeps['completeRankSegments']
> => {
  return async (context) => {
    const stepKey = context.stepKey;
    const elapsed = createCutsDevTimer();
    const settings = getCutsSettings(context);

    logCutsDev(stepKey, 'Calling LLM for cut ranking', {
      runId: context.runId,
      modelTier: settings.modelTier,
    });

    const resolvedModel = await resolveCutsRankModel(prisma, settings.modelTier);

    logCutsDev(stepKey, 'Rank model resolved', {
      runId: context.runId,
      modelTier: settings.modelTier,
      modelId: resolvedModel.modelId,
      providerSlug: resolvedModel.providerSlug,
      externalModelId: resolvedModel.externalModelId,
    });

    const provider = sdk.ia.factory.createTextForModel(resolvedModel);
    const systemPrompt = buildCutsSystemPrompt(context);
    const userPrompt = buildCutsUserPrompt(context);

    logCutsDev(stepKey, 'Sending LLM request', {
      runId: context.runId,
      model: provider.model,
      systemPromptChars: systemPrompt.length,
      userPromptChars: userPrompt.length,
    });

    const response = await provider.complete({
      model: provider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      structuredOutputSchema: zodToJsonSchema(cutsLlmOutputZod),
    });

    logCutsDev(stepKey, 'LLM response received', {
      runId: context.runId,
      model: provider.resolved.modelLabel,
      responseChars: response.content.length,
      tokensInput: response.usage.promptTokens,
      tokensOutput: response.usage.completionTokens,
      elapsedMs: elapsed(),
    });

    const parsed = parseLlmJson(response.content, cutsLlmOutputZod);
    if (!parsed.success) {
      errorCutsDev(stepKey, 'LLM response failed schema validation', undefined, {
        runId: context.runId,
        validationError: parsed.error,
        responsePreview: response.content.slice(0, 300),
        elapsedMs: elapsed(),
      });
      return {
        type: 'FAILED',
        error: parsed.error ?? 'LLM response failed schema validation',
      };
    }

    const output = buildRankOutput(parsed.data, context);
    const cuts = output.cuts ?? [];

    logCutsDev(stepKey, 'Cuts ranked successfully', {
      runId: context.runId,
      ...summarizeCuts(cuts),
      elapsedMs: elapsed(),
    });

    return {
      type: 'CONTINUE',
      output,
      llmModel: provider.resolved.modelLabel,
      tokensInput: response.usage.promptTokens,
      tokensOutput: response.usage.completionTokens,
      creditCost: calculateModelCost(provider.resolved, {
        tokensInput: response.usage.promptTokens,
        tokensOutput: response.usage.completionTokens,
      }),
    };
  };
};
