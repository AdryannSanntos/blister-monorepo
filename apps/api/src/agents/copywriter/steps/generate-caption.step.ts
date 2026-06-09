import type { StepExecutionContext, StepResult } from '../../runtime/kernel/types';
import type { LlmProvider } from '../../runtime/kernel/agent-execution.kernel';
import { toUserFacingProviderError } from '../../../ai-runtime/provider-error.util';
import { buildCopywriterSystemPrompt, buildCopywriterUserPrompt } from '../prompts/caption.system';
import { copywriterOutputSchema } from '../schemas/output.schema';

export async function executeGenerateCaptionStep(
  context: StepExecutionContext,
  llmProvider: LlmProvider,
): Promise<StepResult> {
  const { brandProfile, contextPack, inputPayload } = context;

  const userInput = (inputPayload as { userInput?: string }).userInput ?? '';

  if (!userInput) {
    return {
      type: 'FAILED',
      error: 'User input is required for caption generation',
    };
  }

  const systemPrompt = buildCopywriterSystemPrompt(brandProfile, contextPack);
  const userPrompt = buildCopywriterUserPrompt(userInput);

  try {
    const response = await llmProvider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      agentId: context.agentId,
      maxTokens: 1024,
      temperature: 0.8,
      structuredOutputSchema: copywriterOutputSchema,
    });

    let output: Record<string, unknown>;

    if (response.structuredOutput) {
      output = response.structuredOutput;
    } else {
      try {
        output = JSON.parse(response.content) as Record<string, unknown>;
      } catch {
        return {
          type: 'FAILED',
          error: 'Failed to parse LLM response as JSON',
        };
      }
    }

    const hashtags = output.hashtags as string[] | undefined;
    if (hashtags) {
      output.hashtags = hashtags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`,
      );
    }

    return {
      type: 'CONTINUE',
      output,
      llmModel: response.model,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      creditCost: response.costUsd,
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: toUserFacingProviderError(error),
    };
  }
}
