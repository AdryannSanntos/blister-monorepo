import { AnthropicAdapter } from '../../src/ai-runtime/adapters/anthropic.adapter';
import { AssemblyAILlmGatewayAdapter } from '../../src/ai-runtime/adapters/assemblyai-llm-gateway.adapter';
import { AssemblyAIAdapter } from '../../src/ai-runtime/adapters/assemblyai.adapter';
import { GeminiAdapter } from '../../src/ai-runtime/adapters/gemini.adapter';
import { OpenAIAdapter } from '../../src/ai-runtime/adapters/openai.adapter';
import { OpenRouterAdapter } from '../../src/ai-runtime/adapters/openrouter.adapter';
import { AIRuntimeService } from '../../src/ai-runtime/ai-runtime.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Builds an AIRuntimeService for Trigger.dev tasks, which run outside the Nest DI
 * container and must wire adapters by hand. Centralized here so the positional
 * constructor arguments stay in sync with AIRuntimeService — a mismatch leaves
 * later adapters undefined and crashes at call time with
 * "Cannot read properties of undefined (reading 'supports')".
 */
export function createAIRuntimeService(prisma: PrismaService): AIRuntimeService {
  return new AIRuntimeService(
    prisma,
    new AssemblyAIAdapter(),
    new AssemblyAILlmGatewayAdapter(),
    new OpenRouterAdapter(),
    new OpenAIAdapter(),
    new AnthropicAdapter(),
    new GeminiAdapter(),
  );
}
