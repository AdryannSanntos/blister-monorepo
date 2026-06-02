import { schemaTask } from '@trigger.dev/sdk';
import { ConfigService } from '@nestjs/config';
import { AgentBlockExecutorRegistry } from '../src/agents/agent-block-executor.registry';
import { AgentBlockRegistrationService } from '../src/agents/agent-block-registration.service';
import { AgentContextService } from '../src/agents/agent-context.service';
import { AgentExecutionService } from '../src/agents/agent-execution.service';
import { AgentQueueService } from '../src/agents/agent-queue.service';
import { AgentRunsService } from '../src/agents/agent-runs.service';
import { AgentWorkflowRuntimeService } from '../src/agents/agent-workflow-runtime.service';
import { HtmlPreviewService } from '../src/agents/html-preview.service';
import { CreditsService } from '../src/credits/credits.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { createAIRuntimeService } from './shared/ai-runtime';
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
      const aiRuntime = createAIRuntimeService(prisma);
      const queueService = new AgentQueueService(prisma);
      const storageService = new StorageService(config);
      const htmlPreviewService = new HtmlPreviewService(prisma, storageService);
      const registry = new AgentBlockExecutorRegistry();
      const workflowRuntime = new AgentWorkflowRuntimeService(prisma, registry);
      const creditsService = new CreditsService(prisma);

      const executionService = new AgentExecutionService(
        prisma,
        aiRuntime,
        creditsService,
        htmlPreviewService,
        queueService,
        workflowRuntime,
      );

      // Needed by agent_call executor to spawn child runs
      const contextService = new AgentContextService(prisma);
      const agentRunsService = new AgentRunsService(
        prisma,
        queueService,
        executionService,
        contextService,
      );

      new AgentBlockRegistrationService(registry, agentRunsService, workflowRuntime).onModuleInit();

      return await executionService.processRun(payload);
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
