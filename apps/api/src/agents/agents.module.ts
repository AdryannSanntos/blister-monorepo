import { Module } from '@nestjs/common';
import { AIRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { CreditsModule } from '../credits/credits.module';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRunsController } from './agent-runs.controller';
import { PlatformAgentRunsController } from './agent-runs.controller';
import { AgentRunsService } from './agent-runs.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [AIRuntimeModule, CreditsModule],
  controllers: [AgentsController, AgentRunsController, PlatformAgentRunsController],
  providers: [AgentsService, AgentRunsService, AgentExecutionService],
  exports: [AgentsService, AgentRunsService, AgentExecutionService],
})
export class AgentsModule {}
