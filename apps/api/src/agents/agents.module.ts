import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CreditsModule } from '../credits/credits.module';
import { RagModule } from '../rag/rag.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { CompanyModule } from '../company/company.module';
import { StorageModule } from '../storage/storage.module';

import { AgentRegistryService } from './runtime/agent-registry.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';
import { AgentRunService } from './runtime/agent-run.service';
import { AgentRunBlockService } from './runtime/agent-run-block.service';
import { AgentRunReviewService } from './runtime/agent-run-review.service';
import { CreditStepInterceptor } from './runtime/credit-step.interceptor';
import { AgentSseService } from './runtime/agent-sse.service';

import { AgentsController } from './agents.controller';
import { AgentRunsController } from './agent-runs.controller';
import { AgentCatalogController } from './agent-catalog.controller';
import { InternalEventsController } from './internal-events.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    CreditsModule,
    RagModule,
    AiRuntimeModule,
    CompanyModule,
    StorageModule,
  ],
  controllers: [
    AgentCatalogController,
    AgentRunsController,
    AgentsController,
    InternalEventsController,
  ],
  providers: [
    AgentRegistryService,
    WorkflowEngineService,
    AgentRunService,
    AgentRunBlockService,
    AgentRunReviewService,
    CreditStepInterceptor,
    AgentSseService,
  ],
  exports: [
    AgentRegistryService,
    WorkflowEngineService,
    AgentRunService,
    AgentRunBlockService,
    AgentRunReviewService,
    AgentSseService,
  ],
})
export class AgentsModule {}
