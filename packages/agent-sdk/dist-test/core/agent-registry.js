"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = exports.toStepExecutors = exports.toRuntimeDefinition = void 0;
const RUNTIME_STEP_TYPES = new Set([
    'preparation',
    'clarification',
    'llm_call',
    'validation',
    'output',
    'image_generation',
]);
const toRuntimeStepType = (type) => {
    if (type === 'form' || type === 'decision')
        return 'clarification';
    return RUNTIME_STEP_TYPES.has(type)
        ? type
        : 'preparation';
};
/** Maps a built agent into the runtime definition consumed by `executeRun`. */
const toRuntimeDefinition = (agent) => ({
    agentId: agent.definition.agentId,
    version: agent.definition.version,
    label: agent.definition.label,
    description: agent.definition.description ?? '',
    inputSchema: agent.definition.inputSchema,
    outputSchema: agent.definition.outputSchema,
    steps: agent.definition.steps.map((step) => ({
        key: step.key,
        label: step.label,
        type: toRuntimeStepType(step.type),
        config: step.config,
    })),
    capabilities: agent.definition.capabilities,
    skills: agent.definition.skills,
    middleware: agent.middleware,
    routing: agent.routing,
});
exports.toRuntimeDefinition = toRuntimeDefinition;
/** Builds the `agentId:stepKey` executor map from one or more built agents. */
const toStepExecutors = (agents) => {
    const executors = {};
    for (const agent of agents) {
        for (const [stepKey, executor] of Object.entries(agent.steps)) {
            executors[`${agent.definition.agentId}:${stepKey}`] = executor;
        }
    }
    return executors;
};
exports.toStepExecutors = toStepExecutors;
/** Global registry of built agents, keyed by `agentId@version`. */
class AgentRegistry {
    static agents = new Map();
    static register(agent) {
        AgentRegistry.agents.set(agent.definition.agentId, agent);
    }
    static get(agentId) {
        return AgentRegistry.agents.get(agentId);
    }
    static getRuntimeDefinition(agentId) {
        const agent = AgentRegistry.agents.get(agentId);
        return agent ? (0, exports.toRuntimeDefinition)(agent) : null;
    }
    static list() {
        return [...AgentRegistry.agents.values()];
    }
    static clear() {
        AgentRegistry.agents.clear();
    }
}
exports.AgentRegistry = AgentRegistry;
