import { Injectable, type OnModuleInit } from '@nestjs/common';
import { AgentBlockExecutorRegistry } from './agent-block-executor.registry';
import { AgentRunsService } from './agent-runs.service';
import { AgentWorkflowRuntimeService } from './agent-workflow-runtime.service';
import { createAgentCallExecutor } from './blocks/agent-call-block.executor';
import { booleanBlockExecutor } from './blocks/boolean-block.executor';
import { clarificationBlockExecutor } from './blocks/clarification-block.executor';
import { decisionBlockExecutor } from './blocks/decision-block.executor';
import { finalizerBlockExecutor } from './blocks/finalizer-block.executor';
import { formBlockExecutor } from './blocks/form-block.executor';
import { ifElseBlockExecutor } from './blocks/if-else-block.executor';
import { inputBlockExecutor } from './blocks/input-block.executor';
import { outputFormatterBlockExecutor } from './blocks/output-formatter-block.executor';
import { validationBlockExecutor } from './blocks/validation-block.executor';

@Injectable()
export class AgentBlockRegistrationService implements OnModuleInit {
  constructor(
    private readonly registry: AgentBlockExecutorRegistry,
    private readonly agentRunsService: AgentRunsService,
    private readonly workflowRuntime: AgentWorkflowRuntimeService,
  ) {}

  onModuleInit() {
    this.registry.register('input', inputBlockExecutor);
    this.registry.register('decision', decisionBlockExecutor);
    this.registry.register('boolean', booleanBlockExecutor);
    this.registry.register('if_else', ifElseBlockExecutor);
    this.registry.register(
      'agent_call',
      createAgentCallExecutor(this.agentRunsService, this.workflowRuntime),
    );
    this.registry.register('clarification', clarificationBlockExecutor);
    this.registry.register('form', formBlockExecutor);
    this.registry.register('validation', validationBlockExecutor);
    this.registry.register('output_formatter', outputFormatterBlockExecutor);
    this.registry.register('finalizer', finalizerBlockExecutor);
  }
}
