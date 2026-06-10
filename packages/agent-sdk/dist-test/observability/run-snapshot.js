"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSnapshotBuilder = void 0;
class RunSnapshotBuilder {
    snapshot;
    constructor(params) {
        this.snapshot = {
            runId: params.runId,
            agentId: params.agentId,
            agentVersion: params.agentVersion,
            companyId: params.companyId,
            input: params.input,
            prompts: [],
            stepOutputs: [],
            llmResponses: [],
        };
    }
    withContextPack(pack) {
        this.snapshot.contextPack = pack;
        return this;
    }
    recordStepOutput(stepKey, output) {
        this.snapshot.stepOutputs.push({ stepKey, output });
        return this;
    }
    recordPrompt(stepKey, prompt) {
        this.snapshot.prompts.push({ stepKey, ...prompt });
        return this;
    }
    recordLlmResponse(stepKey, response) {
        this.snapshot.llmResponses.push({ stepKey, ...response });
        return this;
    }
    build() {
        return this.snapshot;
    }
}
exports.RunSnapshotBuilder = RunSnapshotBuilder;
