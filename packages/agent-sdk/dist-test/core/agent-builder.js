"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAgent = exports.AgentBuilder = void 0;
const learning_registry_1 = require("../learning/learning-registry");
const types_1 = require("../middleware/types");
const tool_registry_1 = require("../tools/tool-registry");
const zod_to_json_schema_1 = require("../schemas/zod-to-json-schema");
class AgentBuilder {
    agentId;
    version;
    agentLabel = '';
    agentDescription;
    inputSchema;
    outputSchema;
    reviewSchema;
    agentCapabilities = [];
    contextConfig;
    skillIds = [];
    stepDefinitions = [];
    stepExecutors = {};
    learningHandler;
    toolRegistry;
    routingRules = [];
    middleware = (0, types_1.createEmptyMiddleware)();
    estimatedCreditCost;
    constructor(init) {
        if (typeof init === 'string') {
            this.agentId = init;
            return;
        }
        this.agentId = init.id;
        this.version = init.version;
    }
    static create(init) {
        return new AgentBuilder(init);
    }
    label(value) {
        this.agentLabel = value;
        return this;
    }
    description(value) {
        this.agentDescription = value;
        return this;
    }
    input(schema) {
        this.inputSchema = schema;
        return this;
    }
    output(schema) {
        this.outputSchema = schema;
        return this;
    }
    review(schema) {
        this.reviewSchema = schema;
        return this;
    }
    capabilities(values) {
        this.agentCapabilities = values;
        return this;
    }
    estimatedCost(value) {
        this.estimatedCreditCost = value;
        return this;
    }
    withContext(config) {
        this.contextConfig = config;
        return this;
    }
    withSkills(skillIds) {
        this.skillIds = skillIds;
        return this;
    }
    withLearning(handler) {
        this.learningHandler = handler;
        return this;
    }
    withTools(tools) {
        this.toolRegistry = tools instanceof tool_registry_1.ToolRegistry ? tools : tool_registry_1.ToolRegistry.fromTools(tools);
        return this;
    }
    addRouting(rule) {
        this.routingRules.push(rule);
        return this;
    }
    beforeRun(fn) {
        this.middleware.beforeRun.push(fn);
        return this;
    }
    afterRun(fn) {
        this.middleware.afterRun.push(fn);
        return this;
    }
    beforeStep(fn) {
        this.middleware.beforeStep.push(fn);
        return this;
    }
    afterStep(fn) {
        this.middleware.afterStep.push(fn);
        return this;
    }
    addStep(stepKey, step) {
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
    build() {
        if (!this.inputSchema || !this.outputSchema) {
            throw new Error('AgentBuilder requires input and output schemas');
        }
        const definition = {
            agentId: this.agentId,
            version: this.version,
            label: this.agentLabel,
            description: this.agentDescription,
            inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(this.inputSchema),
            outputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(this.outputSchema),
            reviewSchema: this.reviewSchema ? (0, zod_to_json_schema_1.zodToJsonSchema)(this.reviewSchema) : undefined,
            capabilities: this.agentCapabilities,
            steps: this.stepDefinitions,
            context: this.contextConfig,
            skills: this.skillIds.length > 0 ? this.skillIds : undefined,
            isEnabled: true,
            estimatedCreditCost: this.estimatedCreditCost,
        };
        if (this.learningHandler) {
            learning_registry_1.LearningSerializerRegistry.register(this.agentId, this.learningHandler);
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
exports.AgentBuilder = AgentBuilder;
/** Functional shortcut equivalent to the fluent builder. */
const defineAgent = (config) => {
    let builder = AgentBuilder.create(config.version ? { id: config.agentId, version: config.version } : config.agentId)
        .label(config.label)
        .input(config.input)
        .output(config.output);
    if (config.description)
        builder = builder.description(config.description);
    if (config.review)
        builder = builder.review(config.review);
    if (config.capabilities)
        builder = builder.capabilities(config.capabilities);
    if (config.context)
        builder = builder.withContext(config.context);
    if (config.skills)
        builder = builder.withSkills(config.skills);
    if (config.learning)
        builder = builder.withLearning(config.learning);
    for (const step of config.steps) {
        builder = builder.addStep(step.key, step);
    }
    return builder.build();
};
exports.defineAgent = defineAgent;
