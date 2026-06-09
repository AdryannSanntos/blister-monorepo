import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AiRuntimeService } from './ai-runtime.service';
import { EmbeddingService } from './embedding.service';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    OpenRouterAdapter,
    GeminiAdapter,
    AiRuntimeService,
    EmbeddingService,
  ],
  exports: [
    AiRuntimeService,
    EmbeddingService,
    OpenRouterAdapter,
    GeminiAdapter,
  ],
})
export class AiRuntimeModule {}
