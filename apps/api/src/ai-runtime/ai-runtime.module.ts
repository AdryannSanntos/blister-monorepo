import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { AIRuntimeService } from './ai-runtime.service';

@Module({
  providers: [
    AIRuntimeService,
    OpenRouterAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
  exports: [
    AIRuntimeService,
    OpenRouterAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
})
export class AIRuntimeModule {}
