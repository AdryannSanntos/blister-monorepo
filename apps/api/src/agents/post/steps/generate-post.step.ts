import { toUserFacingProviderError } from '../../../ai-runtime/provider-error.util';
import type { LlmCompleteResult, StepExecutor } from '@company-os/agent-sdk';
import { zodToJsonSchema } from '@company-os/agent-sdk';
import { resolveBrandAssets } from '../assets';
import { type PostBrief, buildPostBrief } from '../onboarding';
import { buildPostSystemPrompt, buildPostUserPrompt } from '../prompts/post.system';
import { type PostDesignPlan, postDesignPlanZod } from '../schemas/design-plan.schema';
import { type PostLlmOutput, postLlmOutputZod } from '../schemas/output.schema';

const MAX_TOKENS = 16384;
const TEMPERATURE = 0.7;
const MAX_PARSE_ATTEMPTS = 2;

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function stripMarkdownFences(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

function extractBalancedJsonObject(content: string): Record<string, unknown> | null {
  const start = content.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < content.length; i += 1) {
    const char = content[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = content.slice(start, i + 1);
        try {
          return JSON.parse(candidate) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  const normalized = stripMarkdownFences(content);
  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    const balanced = extractBalancedJsonObject(normalized);
    if (balanced) return balanced;

    const match = normalized.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractSlidesFromBrokenJson(content: string): Array<{ html: string }> {
  const slides: Array<{ html: string }> = [];
  const regex = /"html"\s*:\s*"((?:\\.|[^"\\])*)"/g;

  let match = regex.exec(content);
  while (match) {
    const html = unescapeJsonString(match[1]);
    if (html.trim().length > 0) {
      slides.push({ html });
    }
    match = regex.exec(content);
  }

  return slides;
}

function normalizeHashtags(hashtags: string[]): string[] {
  return hashtags
    .map((tag) => tag.trim().replace(/^#+/, ''))
    .filter((tag) => tag.length > 0)
    .slice(0, 30);
}

function normalizeSlides(raw: unknown): Array<{ html: string }> {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((slide) => {
    if (typeof slide === 'string' && slide.trim().length > 0) {
      return [{ html: slide }];
    }

    if (typeof slide !== 'object' || slide === null) return [];

    const record = slide as Record<string, unknown>;
    const htmlCandidate = record.html ?? record.content ?? record.markup ?? record.body;

    return typeof htmlCandidate === 'string' && htmlCandidate.trim().length > 0
      ? [{ html: htmlCandidate }]
      : [];
  });
}

function buildFallbackCaption(userInput: string, brief: PostBrief): string {
  const trimmed = userInput.trim();
  if (trimmed) return trimmed.slice(0, 2200);
  return `Post para ${brief.platformLabel}`.slice(0, 2200);
}

function parsePostLlmOutput(
  response: LlmCompleteResult,
  userInput: string,
  brief: PostBrief,
): PostLlmOutput | null {
  const raw =
    extractJsonObject(response.content) ??
    (response.content.trim()
      ? ({ slides: extractSlidesFromBrokenJson(response.content) } as Record<string, unknown>)
      : null);

  if (!raw) return null;

  const parsed = postLlmOutputZod.safeParse(raw);
  if (parsed.success) {
    return {
      ...parsed.data,
      caption: parsed.data.caption.trim() || buildFallbackCaption(userInput, brief),
      hashtags: normalizeHashtags(parsed.data.hashtags),
    };
  }

  const slides = normalizeSlides((raw as { slides?: unknown }).slides);
  const recoveredSlides =
    slides.length > 0 ? slides : extractSlidesFromBrokenJson(response.content);

  if (recoveredSlides.length === 0) return null;

  const captionRaw = (raw as { caption?: unknown }).caption;
  const hashtagsRaw = (raw as { hashtags?: unknown }).hashtags;

  const caption =
    typeof captionRaw === 'string' && captionRaw.trim().length > 0
      ? captionRaw
      : buildFallbackCaption(userInput, brief);

  return {
    slides: recoveredSlides.slice(0, 8),
    caption,
    hashtags: Array.isArray(hashtagsRaw)
      ? normalizeHashtags(hashtagsRaw.filter((tag): tag is string => typeof tag === 'string'))
      : [],
  };
}

export const generatePostStep: StepExecutor = async (context, deps) => {
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

  const designPlanApproved =
    context.inputPayload.designPlanApproved === true ||
    context.previousStepsOutput.approve_design_plan?.designPlanApproved === true;

  if (!designPlanApproved) {
    return {
      type: 'FAILED',
      error: 'O plano de design ainda não foi aprovado.',
    };
  }

  const planRaw = context.previousStepsOutput.plan_design?.designPlan;
  const designPlanResult = postDesignPlanZod.safeParse(planRaw);
  if (!designPlanResult.success) {
    return {
      type: 'FAILED',
      error: 'O plano de design não está disponível. Reinicie a geração.',
    };
  }
  const designPlan: PostDesignPlan = designPlanResult.data;

  // Declared outside the try so the catch can always finalize the streaming
  // block — otherwise a provider error leaves it stuck showing "Processando…".
  const progress = deps.message?.thinking();

  try {
    const assets = await resolveBrandAssets(context.brandProfile, deps.assetResolver ?? null);

    const llmParams = {
      system: buildPostSystemPrompt(
        context.brandProfile,
        context.contextPack,
        brief,
        assets,
        designPlan,
      ),
      user: buildPostUserPrompt(userInput, brief, designPlan),
      structuredOutputSchema: zodToJsonSchema(postLlmOutputZod),
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    };

    let lastResponse: LlmCompleteResult | null = null;

    for (let attempt = 1; attempt <= MAX_PARSE_ATTEMPTS; attempt += 1) {
      const params = {
        ...llmParams,
        temperature: attempt === 1 ? TEMPERATURE : 0.35,
      };

      const response = deps.llmProvider.completeStream
        ? await deps.llmProvider.completeStream(params, (delta) => progress?.delta(delta))
        : await deps.llmProvider.complete(params);

      lastResponse = response;
      const output = parsePostLlmOutput(response, userInput, brief);
      if (output) {
        if (progress) await progress.end();
        const postOutput = {
          agentId: 'post',
          platform: brief.platformLabel,
          format: brief.format,
          width: brief.width,
          height: brief.height,
          slidesCount: brief.slidesCount,
          slides: output.slides,
          caption: output.caption,
          hashtags: output.hashtags,
        };
        await deps.message?.output(postOutput);

        return {
          type: 'CONTINUE',
          output: postOutput,
          llmModel: response.model,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          creditCost: response.costUsd,
        };
      }
    }

    if (progress) await progress.end();

    const finishReason =
      typeof lastResponse?.content === 'string' && lastResponse.content.length > 0
        ? 'invalid_payload'
        : 'empty_response';

    return {
      type: 'FAILED',
      error:
        finishReason === 'empty_response'
          ? 'O modelo não retornou conteúdo para o post. Tente novamente.'
          : 'O modelo não retornou slides válidos para o post. Tente novamente.',
    };
  } catch (error) {
    if (progress) await progress.end();
    return {
      type: 'FAILED',
      error: toUserFacingProviderError(error),
    };
  }
};
