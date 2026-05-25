import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { CreditsModule } from '../credits/credits.module';
import { PlatformModule } from '../platform/platform.module';
import { RagModule } from '../rag/rag.module';
import { StorageModule } from '../storage/storage.module';
import { AgentBlockExecutorRegistry } from './agent-block-executor.registry';
import { AgentBlockRegistrationService } from './agent-block-registration.service';
import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';
import { AgentContextService } from './agent-context.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentNotificationsService } from './agent-notifications.service';
import { AgentQueueService } from './agent-queue.service';
import { AgentRunResumeService } from './agent-run-resume.service';
import { AgentRunsController } from './agent-runs.controller';
import { PlatformAgentRunsController } from './agent-runs.controller';
import { AgentRunsService } from './agent-runs.service';
import { AgentWorkflowRuntimeService } from './agent-workflow-runtime.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { CompanyChatController } from './company-chat.controller';
import { CompanyChatService } from './company-chat.service';
import { ContextPolicyService } from './context/context-policy.service';
import { ContextRerankerService } from './context/context-reranker.service';
import { StructuredContextService } from './context/structured-context.service';
import { HtmlPreviewService } from './html-preview.service';

@Module({
  imports: [AIRuntimeModule, CreditsModule, PlatformModule, StorageModule, RagModule],
  controllers: [
    AgentsController,
    AgentRunsController,
    PlatformAgentRunsController,
    AgentChatController,
    CompanyChatController,
  ],
  providers: [
    AgentsService,
    AgentRunsService,
    AgentExecutionService,
    AgentChatService,
    AgentChatOrchestratorService,
    AgentContextService,
    AgentBlockExecutorRegistry,
    AgentBlockRegistrationService,
    AgentWorkflowRuntimeService,
    AgentRunResumeService,
    CompanyChatService,
    HtmlPreviewService,
    AgentIntentService,
    AgentQueueService,
    ContextPolicyService,
    StructuredContextService,
    ContextRerankerService,
    AgentNotificationsService,
  ],
  exports: [
    AgentsService,
    AgentRunsService,
    AgentExecutionService,
    AgentChatService,
    AgentChatOrchestratorService,
    AgentContextService,
    AgentBlockExecutorRegistry,
    AgentBlockRegistrationService,
    AgentWorkflowRuntimeService,
    AgentRunResumeService,
    CompanyChatService,
    HtmlPreviewService,
    AgentIntentService,
    AgentQueueService,
    ContextPolicyService,
    StructuredContextService,
    ContextRerankerService,
    AgentNotificationsService,
  ],
})
export class AgentsModule {}
