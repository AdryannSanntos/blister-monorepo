"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepTestHarness = void 0;
const stubs_1 = require("./stubs");
const EMPTY_PACK = { chunks: [], totalFound: 0 };
const baseContext = (overrides) => ({
    runId: 'step_harness_run',
    agentId: 'harness_agent',
    companyId: 'harness_company',
    campaignId: null,
    stepKey: 'step',
    stepIndex: 0,
    inputPayload: {},
    previousStepsOutput: {},
    contextPack: EMPTY_PACK,
    brandProfile: null,
    ...overrides,
});
/** Runs a single step executor in isolation with injected context/LLM stub. */
class StepTestHarness {
    step;
    context = baseContext({});
    llmResponse = {};
    imageProvider = (0, stubs_1.createStubImageProvider)();
    constructor(step) {
        this.step = step;
    }
    static forStep(step) {
        return new StepTestHarness(step);
    }
    withContext(overrides) {
        this.context = baseContext(overrides);
        return this;
    }
    withLlmResponse(response) {
        this.llmResponse = response;
        return this;
    }
    withImageProvider(provider) {
        this.imageProvider = provider;
        return this;
    }
    async execute() {
        const deps = {
            llmProvider: (0, stubs_1.createStubLlmProvider)(this.llmResponse),
            imageProvider: this.imageProvider,
            assetResolver: null,
            message: null,
        };
        if (this.step.length >= 2) {
            return this.step(this.context, deps);
        }
        return this.step(this.context);
    }
}
exports.StepTestHarness = StepTestHarness;
