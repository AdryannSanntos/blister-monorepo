import { GeminiAdapter } from '../../ai-runtime/adapters/gemini.adapter';
import { OpenRouterAdapter } from '../../ai-runtime/adapters/openrouter.adapter';
import { EmbeddingService } from '../../ai-runtime/embedding.service';
import type { PrismaClient } from '../../generated/prisma';
import type { PrismaService } from '../../prisma/prisma.service';
import { ContextPackService } from '../../rag/context-pack.service';
import { EmbeddingRepository } from '../../rag/embedding.repository';
import { RetrievalService } from '../../rag/retrieval.service';
import type { ContextPackBuilder } from '@company-os/agent-sdk';
import { adaptContextPackService } from './context-pack-builder.adapter';

class EnvConfigService {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    return (process.env[key] as T | undefined) ?? defaultValue;
  }
}

export const createTriggerContextPackBuilder = (prisma: PrismaClient): ContextPackBuilder => {
  const config = new EnvConfigService();
  const prismaService = prisma as unknown as PrismaService;
  const openRouterAdapter = new OpenRouterAdapter(config as never);
  const geminiAdapter = new GeminiAdapter(config as never);
  const embeddingService = new EmbeddingService(prismaService, openRouterAdapter, geminiAdapter);
  const embeddingRepository = new EmbeddingRepository(prismaService, embeddingService);
  const retrievalService = new RetrievalService(embeddingRepository);
  const contextPackService = new ContextPackService(retrievalService, prismaService);

  return adaptContextPackService(contextPackService);
};
