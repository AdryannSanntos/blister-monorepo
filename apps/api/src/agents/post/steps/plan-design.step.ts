import { toUserFacingProviderError } from '../../../ai-runtime/provider-error.util';
import type { CustomStepExecutor } from '../../runtime/kernel/agent-execution.kernel';
import type { LlmCompletion } from '../../runtime/kernel/agent-execution.kernel';
import { resolveBrandAssets } from '../assets';
import { buildPostBrief } from '../onboarding';
import { buildPlanDesignSystemPrompt, buildPlanDesignUserPrompt } from '../prompts/post.plan';
import { normalizeDesignPlanInput } from '../schemas/design-plan.normalize';
import { postDesignPlanSchema } from '../schemas/design-plan.schema';

const MAX_TOKENS = 4096;
const TEMPERATURE = 0.35;
const MAX_ATTEMPTS = 2;

function extractJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const normalized = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(normalized.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseDesignPlan(
  response: LlmCompletion,
  expectedSlides: number,
  brandVisualStyle?: string,
) {
  const raw = response.structuredOutput ?? extractJsonObject(response.content);
  if (!raw) return null;
  return normalizeDesignPlanInput(raw, expectedSlides, { brandVisualStyle });
}

/**
 * Planning step. Uses the blister-social-post-uiux skill to produce a detailed
 * design plan before HTML generation. Output is consumed by generate_post.
 */
export const planDesignStep: CustomStepExecutor = async (context, deps) => {
  if (!deps.llmProvider) {
    return {
      type: 'FAILED',
      error:
        'Nenhum provedor de texto está configurado. Adicione OPENROUTER_API_KEY ou GEMINI_API_KEY no servidor.',
    };
  }

  const brief = buildPostBrief(context.inputPayload);
  const userInput =
    typeof context.inputPayload.userInput === 'string' ? context.inputPayload.userInput : '';
  const brandVisualStyle = context.brandProfile?.visualStyle?.trim() || undefined;

  try {
    const assets = await resolveBrandAssets(context.brandProfile, deps.assetResolver);

    const baseParams = {
      messages: [
        {
          role: 'system' as const,
          content: buildPlanDesignSystemPrompt(
            context.brandProfile,
            context.contextPack,
            brief,
            assets,
          ),
        },
        {
          role: 'user' as const,
          content: buildPlanDesignUserPrompt(userInput, brief),
        },
      ],
      agentId: context.agentId,
      maxTokens: MAX_TOKENS,
      structuredOutputSchema: postDesignPlanSchema,
    };

    const thinking = deps.message.thinking();
    let lastResponse: LlmCompletion | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const params = {
        ...baseParams,
        temperature: attempt === 1 ? TEMPERATURE : 0.25,
      };

      const response =
        deps.llmProvider.completeStream
          ? await deps.llmProvider.completeStream(params, (delta) => thinking.delta(delta))
          : await deps.llmProvider.complete(params);

      lastResponse = response;
      const plan = parseDesignPlan(response, brief.slidesCount, brandVisualStyle);
      if (plan) {
        await thinking.end();
        await deps.message.planning({
          summary: plan.creativeDirection,
          plan: {
            id: context.runId,
            title: 'Plano de design',
            summary: plan.creativeDirection,
            status: 'awaiting_approval',
          },
          designPlan: plan,
          brandVisualStyle: plan.brandVisualStyle,
        });

        return {
          type: 'CONTINUE',
          output: { designPlan: plan },
          llmModel: response.model,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          creditCost: response.costUsd,
        };
      }
    }

    await thinking.end();

    const hasContent =
      typeof lastResponse?.content === 'string' && lastResponse.content.length > 0;

    return {
      type: 'FAILED',
      error: hasContent
        ? 'Não foi possível montar o plano de design. Tente novamente.'
        : 'O modelo não retornou o plano de design. Tente novamente.',
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: toUserFacingProviderError(error),
    };
  }
};
