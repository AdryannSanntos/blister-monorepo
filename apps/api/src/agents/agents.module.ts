import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { CreditsModule } from '../credits/credits.module';
import { PlatformModule } from '../platform/platform.module';
import { StorageModule } from '../storage/storage.module';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentIntentService } from './agent-intent.service';
import { AgentQueueService } from './agent-queue.service';
import { AgentRunsController } from './agent-runs.controller';
import { PlatformAgentRunsController } from './agent-runs.controller';
import { AgentRunsService } from './agent-runs.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { ContextPolicyService } from './context/context-policy.service';
import { ContextRerankerService } from './context/context-reranker.service';
import { RagContextService } from './context/rag-context.service';
import { StructuredContextService } from './context/structured-context.service';
import { CompanyChatController } from './company-chat.controller';
import { CompanyChatService } from './company-chat.service';
import { AgentNotificationsService } from './agent-notifications.service';
import { HtmlPreviewService } from './html-preview.service';

@Module({
  imports: [AIRuntimeModule, CreditsModule, PlatformModule, StorageModule],
  controllers: [AgentsController, AgentRunsController, PlatformAgentRunsController, AgentChatController, CompanyChatController],
  providers: [
    AgentsService,
    AgentRunsService,
    AgentExecutionService,
    AgentChatService,
    CompanyChatService,
    HtmlPreviewService,
    AgentIntentService,
    AgentQueueService,
    ContextPolicyService,
    StructuredContextService,
    RagContextService,
    ContextRerankerService,
    AgentNotificationsService,
  ],
  exports: [
    AgentsService,
    AgentRunsService,
    AgentExecutionService,
    AgentChatService,
    CompanyChatService,
    HtmlPreviewService,
    AgentIntentService,
    AgentQueueService,
    ContextPolicyService,
    StructuredContextService,
    RagContextService,
    ContextRerankerService,
    AgentNotificationsService,
  ],
})
export class AgentsModule {}
