import { type AgentIaSdk, calculateModelCost } from '@company-os/agent-ia-sdk';
import { toUserFacingProviderError } from './provider-error-message';
import type { LlmProvider } from './agent-execution.kernel';

const REQUIRED_TEXT_CAPABILITIES = ['text', 'structured_output'];

/**
 * Bridges the SDK text capability (`sdk.ia`) to the agent kernel's `LlmProvider`
 * port. The model is resolved per call from the agent/step policy; cost is
 * computed from the resolved model's pricing. Works in both NestJS and Trigger
 * runtimes — just pass the wired `AgentIaSdk`.
 */
export const createTriggerLlmProvider = (sdk: AgentIaSdk): LlmProvider => ({
  async complete(params) {
    try {
      const provider = await sdk.ia.text({
        agentId: params.agentId,
        stepKey: params.stepKey,
        requiredCapabilities: REQUIRED_TEXT_CAPABILITIES,
      });

      const result = await provider.complete({
        model: provider.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        structuredOutputSchema: params.structuredOutputSchema,
      });

      return {
        content: result.content,
        model: provider.resolved.modelLabel,
        tokensInput: result.usage.promptTokens,
        tokensOutput: result.usage.completionTokens,
        costUsd: calculateModelCost(provider.resolved, {
          tokensInput: result.usage.promptTokens,
          tokensOutput: result.usage.completionTokens,
        }),
        structuredOutput: result.structuredOutput,
      };
    } catch (error) {
      throw new Error(toUserFacingProviderError(error));
    }
  },

  async completeStream(params, onChunk) {
    try {
      const provider = await sdk.ia.text({
        agentId: params.agentId,
        stepKey: params.stepKey,
        requiredCapabilities: REQUIRED_TEXT_CAPABILITIES,
      });

      // Batch deltas so we emit fewer, slightly larger chunks — smoother to
      // render and far cheaper when events cross the network (trigger mode).
      let buffer = '';
      const flush = () => {
        if (buffer) {
          onChunk(buffer);
          buffer = '';
        }
      };

      const iterator = provider.stream({
        model: provider.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        structuredOutputSchema: params.structuredOutputSchema,
      });

      let next = await iterator.next();
      while (!next.done) {
        if (next.value.content) {
          buffer += next.value.content;
          if (buffer.length >= 24) flush();
        }
        next = await iterator.next();
      }
      flush();

      const result = next.value;
      return {
        content: result.content,
        model: provider.resolved.modelLabel,
        tokensInput: result.usage.promptTokens,
        tokensOutput: result.usage.completionTokens,
        costUsd: calculateModelCost(provider.resolved, {
          tokensInput: result.usage.promptTokens,
          tokensOutput: result.usage.completionTokens,
        }),
        structuredOutput: result.structuredOutput,
      };
    } catch (error) {
      throw new Error(toUserFacingProviderError(error));
    }
  },
});
