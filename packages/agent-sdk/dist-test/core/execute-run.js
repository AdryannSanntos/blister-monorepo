"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRun = executeRun;
const types_1 = require("@company-os/types");
const build_step_context_1 = require("../context/build-step-context");
const types_2 = require("../middleware/types");
const run_snapshot_1 = require("../observability/run-snapshot");
const routing_1 = require("../routing/routing");
const stream_1 = require("../stream");
const default_step_runner_1 = require("./default-step-runner");
const runMiddleware = async (handlers, ctx) => {
    for (const handler of handlers) {
        try {
            await handler(ctx);
        }
        catch {
            // Middleware is best-effort and must never break the run.
        }
    }
};
const reportUsage = async (deps, run, stepKey, stepResult) => {
    if (!deps.usage)
        return;
    if (!stepResult.tokensInput && !stepResult.tokensOutput && !stepResult.llmModel)
        return;
    try {
        await deps.usage.reportUsage({
            runId: run.id,
            stepKey,
            agentId: run.agentId,
            companyId: run.companyId,
            tokensInput: stepResult.tokensInput ?? 0,
            tokensOutput: stepResult.tokensOutput ?? 0,
            costUsd: stepResult.creditCost ?? 0,
            model: stepResult.llmModel,
        });
    }
    catch {
        // Usage reporting is best-effort.
    }
};
const resolveStartStepIndex = (agentDefinition, params, run) => {
    if (params.resumeFromStep) {
        const index = agentDefinition.steps.findIndex((step) => step.key === params.resumeFromStep);
        if (index === -1) {
            return { error: `Unknown step: ${params.resumeFromStep}` };
        }
        return index;
    }
    if (run.currentStepKey) {
        const index = agentDefinition.steps.findIndex((step) => step.key === run.currentStepKey);
        if (index >= 0)
            return index;
    }
    return 0;
};
async function executeRun(deps, params) {
    const { runStore, eventPublisher, stubMode } = deps;
    let run = await runStore.findRun(params.runId);
    if (!run) {
        throw new Error(`Agent run not found: ${params.runId}`);
    }
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
        return {
            runId: run.id,
            status: run.status,
            outputPayload: run.outputPayload,
            errorMessage: run.errorMessage ?? undefined,
            creditCost: run.creditCost,
        };
    }
    if (run.status === 'PAUSED') {
        return {
            runId: run.id,
            status: 'PAUSED',
            creditCost: run.creditCost,
        };
    }
    const agentDefinition = await deps.loadAgentDefinition(run.agentId);
    if (!agentDefinition) {
        throw new Error(`Agent definition not found: ${run.agentId}`);
    }
    if (params.formData && Object.keys(params.formData).length > 0) {
        run = await runStore.mergeInputPayload(run.id, params.formData);
    }
    const claimed = await runStore.claimRunForExecution(run.id, run.startedAt);
    if (!claimed) {
        const fresh = await runStore.findRun(run.id);
        if (fresh && ['COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'].includes(fresh.status)) {
            return {
                runId: fresh.id,
                status: fresh.status,
                outputPayload: fresh.outputPayload,
                errorMessage: fresh.errorMessage ?? undefined,
                creditCost: fresh.creditCost,
            };
        }
        throw new Error(`Run ${run.id} is already being executed`);
    }
    run = claimed;
    await eventPublisher.publish((0, stream_1.createRunStartedEvent)(run.id, run.agentId, run.companyId));
    const middleware = agentDefinition.middleware ?? (0, types_2.createEmptyMiddleware)();
    const routingRules = agentDefinition.routing ?? [];
    const skippedSteps = new Set();
    const snapshot = new run_snapshot_1.RunSnapshotBuilder({
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        agentVersion: agentDefinition.version,
        input: run.inputPayload,
    });
    await deps.telemetry?.onRunStarted?.({
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
    });
    await runMiddleware(middleware.beforeRun, {
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        inputPayload: run.inputPayload,
    });
    const finishRun = async (status, creditCost, outputPayload) => {
        await runMiddleware(middleware.afterRun, {
            runId: run.id,
            agentId: run.agentId,
            companyId: run.companyId,
            inputPayload: run.inputPayload,
            status,
            outputPayload,
            creditCost,
        });
        await deps.telemetry?.onRunFinished?.({
            runId: run.id,
            agentId: run.agentId,
            status,
            creditCost,
        });
        await deps.telemetry?.onSnapshot?.(snapshot.build());
    };
    const existingBlocks = await deps.blocks.listByRun(run.id);
    const messageStartIndex = (0, types_1.nextAgentMessageIndex)(existingBlocks.map((block) => block.messageId));
    const emitter = new stream_1.BlockEmitter({
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        publisher: eventPublisher,
        blocks: deps.blocks,
        messageStartIndex,
    });
    if (messageStartIndex === 0) {
        const userInput = run.inputPayload.userInput;
        if (typeof userInput === 'string' && userInput.length > 0) {
            await emitter.userMessage(userInput);
        }
    }
    else if (params.formData && Object.keys(params.formData).length > 0) {
        const answerText = Object.values(params.formData).map(String).join(', ');
        if (answerText.length > 0) {
            await emitter.userMessage(answerText);
        }
    }
    const message = emitter.openMessage('assistant');
    let messageClosed = false;
    const closeMessage = async () => {
        if (messageClosed)
            return;
        messageClosed = true;
        await message.end();
    };
    const platformSettings = await deps.usageReporter.getPlatformSettings();
    let totalCreditCost = run.creditCost;
    try {
        const startStepIndex = resolveStartStepIndex(agentDefinition, params, run);
        if (typeof startStepIndex === 'object') {
            await runStore.failRun({
                runId: run.id,
                errorMessage: startStepIndex.error,
                creditCost: totalCreditCost,
            });
            await eventPublisher.publish((0, stream_1.createRunFailedEvent)(run.id, run.agentId, run.companyId, startStepIndex.error));
            await finishRun('FAILED', totalCreditCost);
            return {
                runId: run.id,
                status: 'FAILED',
                errorMessage: startStepIndex.error,
                creditCost: totalCreditCost,
            };
        }
        let currentOutput = {};
        const genericTextRef = { current: null };
        for (let i = startStepIndex; i < agentDefinition.steps.length; i++) {
            const liveStatus = await runStore.getRunStatus(run.id);
            if (liveStatus === 'CANCELLED') {
                await closeMessage();
                await finishRun('CANCELLED', totalCreditCost);
                return {
                    runId: run.id,
                    status: 'CANCELLED',
                    creditCost: totalCreditCost,
                };
            }
            const stepDef = agentDefinition.steps[i];
            if (skippedSteps.has(stepDef.key)) {
                continue;
            }
            await runStore.setCurrentStepKey(run.id, stepDef.key);
            const existingStep = run.steps.find((s) => s.stepKey === stepDef.key);
            const { stepId } = await runStore.startStep({
                runId: run.id,
                stepKey: stepDef.key,
                stepIndex: i,
                existingStepId: existingStep?.id,
                inputPayload: {
                    ...currentOutput,
                    ...(params.formData ?? {}),
                },
            });
            const previousStepsOutput = await runStore.getCompletedStepOutputs(run.id);
            const stepContext = await (0, build_step_context_1.buildStepContext)({
                runId: run.id,
                agentId: run.agentId,
                companyId: run.companyId,
                campaignId: run.campaignId,
                stepKey: stepDef.key,
                stepIndex: i,
                inputPayload: {
                    ...run.inputPayload,
                    ...currentOutput,
                    ...(params.formData ?? {}),
                },
                brandProfile: run.brandProfile,
                contextPackBuilder: deps.contextPackBuilder,
                previousStepsOutput,
            });
            const onChunk = (delta) => {
                if (!delta)
                    return;
                if (!genericTextRef.current)
                    genericTextRef.current = message.text();
                genericTextRef.current.delta(delta);
            };
            const stepExecutorDeps = {
                llmProvider: deps.llmProvider,
                imageProvider: deps.imageProvider,
                assetResolver: deps.assetResolver ?? null,
                message,
            };
            await runMiddleware(middleware.beforeStep, { stepContext });
            const stepResult = stubMode
                ? await (0, default_step_runner_1.executeStepStub)(stepDef.key, run.agentId)
                : await (0, default_step_runner_1.executeStep)(deps, agentDefinition, stepDef.key, stepContext, stepExecutorDeps, onChunk);
            await reportUsage(deps, run, stepDef.key, stepResult);
            await runMiddleware(middleware.afterStep, { stepContext, result: stepResult });
            await deps.telemetry?.onStepCompleted?.({
                runId: run.id,
                agentId: run.agentId,
                stepKey: stepDef.key,
                status: stepResult.type,
                tokensInput: stepResult.tokensInput,
                tokensOutput: stepResult.tokensOutput,
                creditCost: stepResult.creditCost,
            });
            if (stepResult.output) {
                snapshot.recordStepOutput(stepDef.key, stepResult.output);
            }
            let stepCreditCost = 0;
            if (!stubMode && stepResult.creditCost && stepResult.creditCost > 0) {
                const debitResult = await deps.usageReporter.debitStep({
                    companyId: run.companyId,
                    agentRunId: run.id,
                    agentRunStepId: stepId,
                    stepKey: stepDef.key,
                    baseCost: stepResult.creditCost,
                    markupMultiplier: platformSettings.markupDefault,
                    minRunCost: platformSettings.minRunCost,
                });
                if (!debitResult.success) {
                    await runStore.completeStep({
                        stepId,
                        resultType: 'FAILED',
                        output: {},
                        error: debitResult.error,
                        creditCost: 0,
                        failed: true,
                    });
                    await runStore.failRun({
                        runId: run.id,
                        errorMessage: `Insufficient credit balance: ${debitResult.error}`,
                        creditCost: totalCreditCost,
                    });
                    if (genericTextRef.current) {
                        await genericTextRef.current.end();
                        genericTextRef.current = null;
                    }
                    await message.error(`Insufficient credit balance: ${debitResult.error}`);
                    await closeMessage();
                    await eventPublisher.publish((0, stream_1.createRunFailedEvent)(run.id, run.agentId, run.companyId, debitResult.error ?? 'Unknown'));
                    await finishRun('FAILED', totalCreditCost);
                    return {
                        runId: run.id,
                        status: 'FAILED',
                        errorMessage: debitResult.error,
                        creditCost: totalCreditCost,
                    };
                }
                stepCreditCost = debitResult.debitedAmount;
                totalCreditCost += stepCreditCost;
            }
            const stepFailed = stepResult.type === 'FAILED';
            const stepPaused = stepResult.type === 'PAUSED';
            await runStore.completeStep({
                stepId,
                resultType: stepResult.type,
                output: stepResult.output ?? {},
                error: stepResult.error,
                llmModel: stepResult.llmModel,
                tokensInput: stepResult.tokensInput,
                tokensOutput: stepResult.tokensOutput,
                creditCost: stepCreditCost,
                failed: stepFailed,
                paused: stepPaused,
            });
            if (genericTextRef.current) {
                await genericTextRef.current.end();
                genericTextRef.current = null;
            }
            if (stepPaused) {
                await runStore.pauseRun({
                    runId: run.id,
                    pauseReason: stepResult.pauseReason,
                    pauseFormSchema: stepResult.pauseFormSchema,
                    creditCost: totalCreditCost,
                });
                await closeMessage();
                await eventPublisher.publish((0, stream_1.createRunPausedEvent)(run.id, run.agentId, run.companyId, stepResult.pauseReason ?? 'Unknown', stepResult.pauseFormSchema, run.inputPayload));
                await finishRun('PAUSED', totalCreditCost);
                return {
                    runId: run.id,
                    status: 'PAUSED',
                    pauseReason: stepResult.pauseReason,
                    creditCost: totalCreditCost,
                };
            }
            if (stepFailed) {
                await runStore.failRun({
                    runId: run.id,
                    errorMessage: stepResult.error ?? 'Unknown',
                    creditCost: totalCreditCost,
                });
                await message.error(stepResult.error ?? 'Unknown');
                await closeMessage();
                await eventPublisher.publish((0, stream_1.createRunFailedEvent)(run.id, run.agentId, run.companyId, stepResult.error ?? 'Unknown'));
                await finishRun('FAILED', totalCreditCost);
                return {
                    runId: run.id,
                    status: 'FAILED',
                    errorMessage: stepResult.error,
                    creditCost: totalCreditCost,
                };
            }
            if (stepResult.output) {
                currentOutput = { ...currentOutput, ...stepResult.output };
            }
            await deps.checkpointStore?.saveCheckpoint({
                runId: run.id,
                stepKey: stepDef.key,
                stepIndex: i,
                inputPayload: run.inputPayload,
                previousStepsOutput: await runStore.getCompletedStepOutputs(run.id),
                createdAt: new Date(),
            });
            if (routingRules.length > 0) {
                for (const skip of (0, routing_1.computeRoutingSkips)(routingRules, stepDef.key, stepContext)) {
                    skippedSteps.add(skip);
                }
            }
        }
        currentOutput.reviewStatus = 'PENDING';
        if (genericTextRef.current) {
            await genericTextRef.current.end();
            genericTextRef.current = null;
        }
        await message.ensureOutput({
            agentId: run.agentId,
            ...currentOutput,
        });
        await closeMessage();
        await runStore.completeRun({
            runId: run.id,
            outputPayload: currentOutput,
            creditCost: totalCreditCost,
        });
        await eventPublisher.publish((0, stream_1.createRunCompletedEvent)(run.id, run.agentId, run.companyId, currentOutput, totalCreditCost));
        await finishRun('COMPLETED', totalCreditCost, currentOutput);
        return {
            runId: run.id,
            status: 'COMPLETED',
            outputPayload: currentOutput,
            creditCost: totalCreditCost,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        try {
            if (!messageClosed) {
                await message.error(errorMessage);
                await closeMessage();
            }
        }
        catch {
            // Never let block emission mask the original failure.
        }
        await runStore.failRun({
            runId: run.id,
            errorMessage,
            creditCost: totalCreditCost,
        });
        await eventPublisher.publish((0, stream_1.createRunFailedEvent)(run.id, run.agentId, run.companyId, errorMessage));
        await finishRun('FAILED', totalCreditCost);
        return {
            runId: run.id,
            status: 'FAILED',
            errorMessage,
            creditCost: totalCreditCost,
        };
    }
}
