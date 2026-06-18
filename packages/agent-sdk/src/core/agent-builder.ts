import type { z } from 'zod';
import { LearningSerializerRegistry, type LearningHandler } from '../learning/learning-registry';
import {
  createEmptyMiddleware,
  type AgentMiddleware,
  type RunCompletedMiddleware,
  type RunMiddleware,
  type StepCompletedMiddleware,
  type StepMiddleware,
} from '../middleware/types';
import type { RoutingRule } from '../routing/routing';
import { ToolRegistry, type AgentTool } from '../tools/tool-registry';
import { zodToJsonSchema } from '../schemas/zod-to-json-schema';
import type {
  AgentStepDefinition,
  AnyStepExecutor,
  BuiltAgent,
  BuiltAgentDefinition,
} from './types';

type AgentBuilderInit = string | { id: string; version: string };

interface StepRegistration {
  label: string;
  type: AgentStepDefinition['type'];
  config?: Record<string, unknown>;
  run: AnyStepExecutor;
}

export class AgentBuilder {
  private agentId: string;
  private version?: string;
  private agentLabel = '';
  private agentDescription?: string;
  private inputSchema?: z.ZodType;
  private outputSchema?: z.ZodType;
  private reviewSchema?: z.ZodType;
  private agentCapabilities: string[] = [];
  private skillIds: string[] = [];
  private stepDefinitions: AgentStepDefinition[] = [];
  private stepExecutors: Record<string, AnyStepExecutor> = {};
  private learningHandler?: LearningHandler;
  private toolRegistry?: ToolRegistry;
  private routingRules: RoutingRule[] = [];
  private middleware: AgentMiddleware = createEmptyMiddleware();
  private estimatedCreditCost?: number;

  private constructor(init: AgentBuilderInit) {
    if (typeof init === 'string') {
      this.agentId = init;
      return;
    }

    this.agentId = init.id;
    this.version = init.version;
  }

  static create(init: AgentBuilderInit): AgentBuilder {
    return new AgentBuilder(init);
  }

  label(value: string): this {
    this.agentLabel = value;
    return this;
  }

  description(value: string): this {
    this.agentDescription = value;
    return this;
  }

  input(schema: z.ZodType): this {
    this.inputSchema = schema;
    return this;
  }

  output(schema: z.ZodType): this {
    this.outputSchema = schema;
    return this;
  }

  review(schema: z.ZodType): this {
    this.reviewSchema = schema;
    return this;
  }

  capabilities(values: string[]): this {
    this.agentCapabilities = values;
    return this;
  }

  estimatedCost(value: number): this {
    this.estimatedCreditCost = value;
    return this;
  }

  withSkills(skillIds: string[]): this {
    this.skillIds = skillIds;
    return this;
  }

  withLearning<TFeedback, TInsights>(handler: LearningHandler<TFeedback, TInsights>): this {
    this.learningHandler = handler as unknown as LearningHandler;
    return this;
  }

  withTools(tools: AgentTool[] | ToolRegistry): this {
    this.toolRegistry = tools instanceof ToolRegistry ? tools : ToolRegistry.fromTools(tools);
    return this;
  }

  addRouting(rule: RoutingRule): this {
    this.routingRules.push(rule);
    return this;
  }

  beforeRun(fn: RunMiddleware): this {
    this.middleware.beforeRun.push(fn);
    return this;
  }

  afterRun(fn: RunCompletedMiddleware): this {
    this.middleware.afterRun.push(fn);
    return this;
  }

  beforeStep(fn: StepMiddleware): this {
    this.middleware.beforeStep.push(fn);
    return this;
  }

  afterStep(fn: StepCompletedMiddleware): this {
    this.middleware.afterStep.push(fn);
    return this;
  }

  addStep(stepKey: string, step: StepRegistration): this {
    if (this.stepExecutors[stepKey]) {
      throw new Error(`Duplicate step key: ${stepKey}`);
    }

    this.stepDefinitions.push({
      key: stepKey,
      label: step.label,
      type: step.type,
      config: step.config,
    });
    this.stepExecutors[stepKey] = step.run;

    return this;
  }

  build(): BuiltAgent {
    if (!this.inputSchema || !this.outputSchema) {
      throw new Error('AgentBuilder requires input and output schemas');
    }

    const definition: BuiltAgentDefinition = {
      agentId: this.agentId,
      version: this.version,
      label: this.agentLabel,
      description: this.agentDescription,
      inputSchema: zodToJsonSchema(this.inputSchema),
      outputSchema: zodToJsonSchema(this.outputSchema),
      reviewSchema: this.reviewSchema ? zodToJsonSchema(this.reviewSchema) : undefined,
      capabilities: this.agentCapabilities,
      steps: this.stepDefinitions,
      skills: this.skillIds.length > 0 ? this.skillIds : undefined,
      isEnabled: true,
      estimatedCreditCost: this.estimatedCreditCost,
    };

    if (this.learningHandler) {
      LearningSerializerRegistry.register(this.agentId, this.learningHandler);
    }

    return {
      definition,
      steps: this.stepExecutors,
      learning: this.learningHandler,
      tools: this.toolRegistry,
      routing: this.routingRules.length > 0 ? this.routingRules : undefined,
      middleware: this.middleware,
    };
  }
}

/** Functional shortcut equivalent to the fluent builder. */
export const defineAgent = (config: {
  agentId: string;
  version?: string;
  label: string;
  description?: string;
  input: z.ZodType;
  output: z.ZodType;
  review?: z.ZodType;
  capabilities?: string[];
  skills?: string[];
  learning?: LearningHandler;
  steps: Array<{ key: string } & StepRegistration>;
}): BuiltAgent => {
  let builder = AgentBuilder.create(
    config.version ? { id: config.agentId, version: config.version } : config.agentId,
  )
    .label(config.label)
    .input(config.input)
    .output(config.output);

  if (config.description) builder = builder.description(config.description);
  if (config.review) builder = builder.review(config.review);
  if (config.capabilities) builder = builder.capabilities(config.capabilities);
  if (config.skills) builder = builder.withSkills(config.skills);
  if (config.learning) builder = builder.withLearning(config.learning);

  for (const step of config.steps) {
    builder = builder.addStep(step.key, step);
  }

  return builder.build();
};
