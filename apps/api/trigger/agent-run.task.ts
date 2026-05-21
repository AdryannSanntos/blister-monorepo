import { schemaTask } from '@trigger.dev/sdk';
import { AnthropicAdapter } from '../src/ai-runtime/adapters/anthropic.adapter';
import { GeminiAdapter } from '../src/ai-runtime/adapters/gemini.adapter';
import { OpenAIAdapter } from '../src/ai-runtime/adapters/openai.adapter';
import { OpenRouterAdapter } from '../src/ai-runtime/adapters/openrouter.adapter';
import { AIRuntimeService } from '../src/ai-runtime/ai-runtime.service';
import { AgentExecutionService } from '../src/agents/agent-execution.service';
import { CreditsService } from '../src/credits/credits.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { agentRunTaskPayloadSchema } from './shared/agent-runtime-payloads';

export const agentRunTask = schemaTask({
  id: 'agent-run',
  schema: agentRunTaskPayloadSchema,
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload) => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    try {
      const runtime = new AIRuntimeService(
        prisma,
        new OpenRouterAdapter(),
        new OpenAIAdapter(),
        new AnthropicAdapter(),
        new GeminiAdapter(),
      );
      const executionService = new AgentExecutionService(prisma, runtime, new CreditsService(prisma));
      return await executionService.processRun(payload);
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
