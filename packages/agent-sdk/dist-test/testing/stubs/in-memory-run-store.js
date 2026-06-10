"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requeueForResume = exports.createInMemoryRunStore = void 0;
let stepSeq = 0;
/** In-memory RunStore backing the harness — manages a single run lifecycle. */
const createInMemoryRunStore = (params) => {
    const run = {
        id: params.runId,
        agentId: params.agentId,
        companyId: params.companyId,
        campaignId: params.campaignId ?? null,
        status: 'QUEUED',
        currentStepKey: null,
        inputPayload: params.inputPayload,
        outputPayload: {},
        errorMessage: null,
        creditCost: 0,
        startedAt: null,
        steps: [],
        brandProfile: params.brandProfile ?? null,
    };
    const findStep = (stepId) => run.steps.find((s) => s.id === stepId);
    return {
        current: () => run,
        findRun: async () => ({ ...run, steps: [...run.steps] }),
        mergeInputPayload: async (_runId, formData) => {
            run.inputPayload = { ...run.inputPayload, ...formData };
            return { ...run, steps: [...run.steps] };
        },
        getCompletedStepOutputs: async () => {
            const outputs = {};
            for (const step of run.steps) {
                if (step.status === 'COMPLETED') {
                    outputs[step.stepKey] = step.outputPayload;
                }
            }
            return outputs;
        },
        claimRunForExecution: async () => {
            run.status = 'RUNNING';
            run.startedAt = run.startedAt ?? new Date();
            return { ...run, steps: [...run.steps] };
        },
        getRunStatus: async () => run.status,
        setRunRunning: async () => {
            run.status = 'RUNNING';
        },
        setCurrentStepKey: async (_runId, stepKey) => {
            run.currentStepKey = stepKey;
        },
        startStep: async (p) => {
            if (p.existingStepId) {
                const existing = findStep(p.existingStepId);
                if (existing) {
                    existing.status = 'RUNNING';
                    existing.outputPayload = {};
                    return { stepId: existing.id };
                }
            }
            const stepId = `${run.id}:step:${stepSeq++}`;
            run.steps.push({
                id: stepId,
                stepKey: p.stepKey,
                stepIndex: p.stepIndex,
                status: 'RUNNING',
                outputPayload: {},
            });
            return { stepId };
        },
        completeStep: async (p) => {
            const step = findStep(p.stepId);
            if (!step)
                return;
            step.outputPayload = p.output;
            step.status = p.paused ? 'PAUSED' : p.failed ? 'FAILED' : 'COMPLETED';
        },
        pauseRun: async (p) => {
            run.status = 'PAUSED';
            run.creditCost = p.creditCost;
        },
        failRun: async (p) => {
            run.status = 'FAILED';
            run.errorMessage = p.errorMessage;
            run.creditCost = p.creditCost;
        },
        completeRun: async (p) => {
            run.status = 'COMPLETED';
            run.outputPayload = p.outputPayload;
            run.creditCost = p.creditCost;
        },
    };
};
exports.createInMemoryRunStore = createInMemoryRunStore;
/** Resets the run status to QUEUED so the harness can resume a paused run. */
const requeueForResume = (store) => {
    const run = store.current();
    if (run.status === 'PAUSED') {
        run.status = 'QUEUED';
    }
};
exports.requeueForResume = requeueForResume;
