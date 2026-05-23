import { schemaTask } from '@trigger.dev/sdk';
import { ConfigService } from '@nestjs/config';
import { AnthropicAdapter } from '../src/ai-runtime/adapters/anthropic.adapter';
import { GeminiAdapter } from '../src/ai-runtime/adapters/gemini.adapter';
import { OpenAIAdapter } from '../src/ai-runtime/adapters/openai.adapter';
import { OpenRouterAdapter } from '../src/ai-runtime/adapters/openrouter.adapter';
import { AgentQueueService } from '../src/agents/agent-queue.service';
import { AIRuntimeService } from '../src/ai-runtime/ai-runtime.service';
import { AgentExecutionService } from '../src/agents/agent-execution.service';
import { HtmlPreviewService } from '../src/agents/html-preview.service';
import { CreditsService } from '../src/credits/credits.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { agentRunTaskPayloadSchema } from './shared/agent-runtime-payloads';

export const agentRunTask = schemaTask({
  id: 'agent-run',
  schema: agentRunTaskPayloadSchema,
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload) => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    try {
      const config = new ConfigService();
      const runtime = new AIRuntimeService(
        prisma,
        new OpenRouterAdapter(),
        new OpenAIAdapter(),
        new AnthropicAdapter(),
        new GeminiAdapter(),
      );
      const queueService = new AgentQueueService(prisma);
      const storageService = new StorageService(config);
      const htmlPreviewService = new HtmlPreviewService(prisma, storageService);
      const executionService = new AgentExecutionService(
        prisma,
        runtime,
        new CreditsService(prisma),
        htmlPreviewService,
        queueService,
      );
      return await executionService.processRun(payload);
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
