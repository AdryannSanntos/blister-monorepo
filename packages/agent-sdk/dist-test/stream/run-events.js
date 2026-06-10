"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRunPausedEvent = exports.createRunFailedEvent = exports.createRunCompletedEvent = exports.createRunStartedEvent = void 0;
const createRunStartedEvent = (runId, agentId, companyId) => ({
    runId,
    agentId,
    companyId,
    type: 'run_started',
    data: {},
    timestamp: new Date(),
});
exports.createRunStartedEvent = createRunStartedEvent;
const createRunCompletedEvent = (runId, agentId, companyId, outputPayload, totalCreditCost) => ({
    runId,
    agentId,
    companyId,
    type: 'run_completed',
    data: { outputPayload, totalCreditCost },
    timestamp: new Date(),
});
exports.createRunCompletedEvent = createRunCompletedEvent;
const createRunFailedEvent = (runId, agentId, companyId, errorMessage) => ({
    runId,
    agentId,
    companyId,
    type: 'run_failed',
    data: { errorMessage },
    timestamp: new Date(),
});
exports.createRunFailedEvent = createRunFailedEvent;
const createRunPausedEvent = (runId, agentId, companyId, pauseReason, pauseFormSchema, inputPayload) => ({
    runId,
    agentId,
    companyId,
    type: 'run_paused',
    data: { pauseReason, pauseFormSchema, inputPayload },
    timestamp: new Date(),
});
exports.createRunPausedEvent = createRunPausedEvent;
