import type { StepExecutor as SdkStepExecutor } from '@company-os/agent-sdk';
import type {
  CustomStepExecutor,
  StepExecutorDeps,
} from '../runtime/kernel/agent-execution.kernel';
import type { StepExecutionContext, StepResult } from '@company-os/agent-sdk';

export const wrapSdkStep = (step: SdkStepExecutor): CustomStepExecutor => {
  return async (context: StepExecutionContext, deps: StepExecutorDeps): Promise<StepResult> => {
    return step(context, {
      llmProvider: deps.llmProvider
        ? {
            complete: async (params) => {
              const response = await deps.llmProvider!.complete({
                messages: [
                  { role: 'system', content: params.system },
                  { role: 'user', content: params.user },
                ],
                agentId: context.agentId,
                stepKey: context.stepKey,
                structuredOutputSchema: params.structuredOutputSchema,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
              });

              return {
                content: response.content,
                model: response.model,
                tokensInput: response.tokensInput,
                tokensOutput: response.tokensOutput,
                costUsd: response.costUsd,
              };
            },
            completeStream: deps.llmProvider!.completeStream
              ? async (params, onChunk) => {
                  const response = await deps.llmProvider!.completeStream!(
                    {
                      messages: [
                        { role: 'system', content: params.system },
                        { role: 'user', content: params.user },
                      ],
                      agentId: context.agentId,
                      stepKey: context.stepKey,
                      structuredOutputSchema: params.structuredOutputSchema,
                      maxTokens: params.maxTokens,
                      temperature: params.temperature,
                    },
                    onChunk,
                  );

                  return {
                    content: response.content,
                    model: response.model,
                    tokensInput: response.tokensInput,
                    tokensOutput: response.tokensOutput,
                    costUsd: response.costUsd,
                  };
                }
              : undefined,
          }
        : null,
      imageProvider: deps.imageProvider
        ? {
            generate: async (params) => {
              const result = await deps.imageProvider!.generateImage({
                prompt: String(params.prompt ?? ''),
                agentId: context.agentId,
                stepKey: context.stepKey,
              });

              return {
                imageUrl: result.imageUrl,
                base64: result.base64,
                storageKey: result.storageKey,
              };
            },
          }
        : null,
      message: deps.message,
    });
  };
};
