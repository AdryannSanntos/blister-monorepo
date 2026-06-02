import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { AssemblyAILlmGatewayAdapter } from './adapters/assemblyai-llm-gateway.adapter';
import { AssemblyAIAdapter } from './adapters/assemblyai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { AIRuntimeService } from './ai-runtime.service';

@Module({
  providers: [
    AIRuntimeService,
    AssemblyAIAdapter,
    AssemblyAILlmGatewayAdapter,
    OpenRouterAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
  exports: [
    AIRuntimeService,
    AssemblyAIAdapter,
    AssemblyAILlmGatewayAdapter,
    OpenRouterAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
})
export class AIRuntimeModule {}
