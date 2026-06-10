"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTestHarness = void 0;
const agent_registry_1 = require("../core/agent-registry");
const execute_run_1 = require("../core/execute-run");
const usage_reporter_1 = require("../usage/usage-reporter");
const stubs_1 = require("./stubs");
const EMPTY_PACK = { chunks: [], totalFound: 0 };
const invokeRaw = (executor, context, deps) => {
    if (executor.length >= 2)
        return executor(context, deps);
    return executor(context);
};
let runCounter = 0;
class AgentTestHarness {
    agent;
    llmResponses = {};
    brandProfile = null;
    contextPack = EMPTY_PACK;
    imageProvider = (0, stubs_1.createStubImageProvider)();
    store;
    pendingResumeData;
    lastSnapshot;
    constructor(agent) {
        this.agent = agent;
    }
    static forAgent(agent) {
        return new AgentTestHarness(agent);
    }
    withLlmResponses(responses) {
        this.llmResponses = responses;
        return this;
    }
    withContext(options) {
        if (options.brandProfile !== undefined)
            this.brandProfile = options.brandProfile;
        if (options.contextPack)
            this.contextPack = options.contextPack;
        return this;
    }
    withImageProvider(provider) {
        this.imageProvider = provider;
        return this;
    }
    /** Wraps each SDK step into a runtime executor with a per-step LLM stub. */
    buildStepExecutors() {
        const executors = {};
        const agentId = this.agent.definition.agentId;
        for (const [stepKey, rawStep] of Object.entries(this.agent.steps)) {
            const llm = (0, stubs_1.createStubLlmProvider)(this.llmResponses[stepKey]);
            executors[`${agentId}:${stepKey}`] = async (context, deps) => invokeRaw(rawStep, context, {
                llmProvider: llm,
                imageProvider: this.imageProvider,
                assetResolver: deps.assetResolver,
                message: deps.message,
            });
        }
        return executors;
    }
    buildDeps(events, blocks, usage) {
        return {
            runStore: this.store,
            loadAgentDefinition: async () => (0, agent_registry_1.toRuntimeDefinition)(this.agent),
            contextPackBuilder: (0, stubs_1.createInMemoryContextPackBuilder)(this.contextPack),
            llmProvider: (0, stubs_1.createStubLlmProviderRuntime)({}),
            imageProvider: {
                generateImage: async () => ({
                    imageUrl: 'https://example.com/generated-image.png',
                    storageKey: 'stub/generated-image.png',
                }),
            },
            eventPublisher: events,
            blocks,
            usageReporter: (0, stubs_1.createStubCreditReporter)(),
            assetResolver: null,
            customStepExecutors: this.buildStepExecutors(),
            usage,
            telemetry: {
                onSnapshot: (snapshot) => {
                    this.lastSnapshot = snapshot;
                },
            },
        };
    }
    toResult(events, blocks, usage) {
        const run = this.store.current();
        const pausedEvent = [...events.events].reverse().find((e) => e.type === 'run_paused');
        return {
            status: run.status,
            output: run.status === 'COMPLETED' ? run.outputPayload : undefined,
            steps: run.steps.map((step) => ({
                stepKey: step.stepKey,
                output: step.outputPayload,
                status: step.status,
            })),
            blocks: blocks.blocks,
            events: events.events,
            usage: usage.events,
            creditCost: run.creditCost,
            pauseReason: run.status === 'PAUSED' ? pausedEvent?.data.pauseReason : undefined,
            pauseFormSchema: run.status === 'PAUSED'
                ? pausedEvent?.data.pauseFormSchema
                : undefined,
            errorMessage: run.errorMessage ?? undefined,
            snapshot: this.lastSnapshot,
        };
    }
    async execute(formData) {
        const events = (0, stubs_1.createCollectingEventPublisher)();
        const blocks = (0, stubs_1.createInMemoryBlockStore)();
        const usage = (0, usage_reporter_1.createCollectingUsageReporter)();
        const deps = this.buildDeps(events, blocks, usage);
        await (0, execute_run_1.executeRun)(deps, { runId: this.store.current().id, formData });
        return this.toResult(events, blocks, usage);
    }
    async run(input) {
        if (input && !this.store) {
            this.store = (0, stubs_1.createInMemoryRunStore)({
                runId: `harness_run_${runCounter++}`,
                agentId: this.agent.definition.agentId,
                companyId: 'harness_company',
                inputPayload: input,
                brandProfile: this.brandProfile,
            });
            return this.execute();
        }
        if (!this.store) {
            throw new Error('AgentTestHarness.run requires an input on first call');
        }
        const formData = this.pendingResumeData;
        this.pendingResumeData = undefined;
        (0, stubs_1.requeueForResume)(this.store);
        return this.execute(formData);
    }
    async runUntilPaused(input) {
        return this.run(input);
    }
    resume(formData) {
        this.pendingResumeData = formData;
        return this;
    }
}
exports.AgentTestHarness = AgentTestHarness;
