"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStepContext = void 0;
const buildStepContext = async (params) => {
    const contextPack = await buildContextPack(params.contextPackBuilder, params);
    return {
        runId: params.runId,
        agentId: params.agentId,
        companyId: params.companyId,
        campaignId: params.campaignId,
        stepKey: params.stepKey,
        stepIndex: params.stepIndex,
        inputPayload: params.inputPayload,
        previousStepsOutput: params.previousStepsOutput,
        contextPack,
        brandProfile: params.brandProfile,
    };
};
exports.buildStepContext = buildStepContext;
const buildContextPack = async (contextPackBuilder, params) => {
    const rawInput = params.inputPayload.userInput;
    const userInput = typeof rawInput === 'string' ? rawInput.trim() : '';
    if (!userInput || !contextPackBuilder) {
        return { chunks: [], totalFound: 0 };
    }
    return contextPackBuilder.buildPack({
        companyId: params.companyId,
        query: userInput,
        agentId: params.agentId,
        campaignId: params.campaignId ?? undefined,
        includeBrandBrain: true,
        includeAgentLearning: true,
        includeCampaignContext: Boolean(params.campaignId),
    });
};
