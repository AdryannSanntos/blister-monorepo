import { nextAgentMessageIndex } from '@company-os/types';
import { buildStepContext } from '../context/build-step-context';
import { createEmptyMiddleware, type AgentMiddleware } from '../middleware/types';
import { RunSnapshotBuilder } from '../observability/run-snapshot';
import { computeRoutingSkips } from '../routing/routing';
import {
  BlockEmitter,
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPausedEvent,
  createRunStartedEvent,
} from '../stream';
import type { StreamingBlock } from '../stream';
import type {
  AgentDefinitionRuntime,
  ExecuteRunParams,
  ExecutionKernelDeps,
  KernelRunResult,
} from './agent-runtime-types';
import { executeStep, executeStepStub } from './default-step-runner';
import type { StoredRun } from './run-store';
import type { StepResult } from './types';

const runMiddleware = async <T>(handlers: Array<(ctx: T) => void | Promise<void>>, ctx: T): Promise<void> => {
  for (const handler of handlers) {
    try {
      await handler(ctx);
    } catch {
      // Middleware is best-effort and must never break the run.
    }
  }
};

const reportUsage = async (
  deps: ExecutionKernelDeps,
  run: StoredRun,
  stepKey: string,
  stepResult: StepResult,
): Promise<void> => {
  if (!deps.usage) return;
  if (!stepResult.tokensInput && !stepResult.tokensOutput && !stepResult.llmModel) return;
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
  } catch {
    // Usage reporting is best-effort.
  }
};

const resolveStartStepIndex = (
  agentDefinition: AgentDefinitionRuntime,
  params: ExecuteRunParams,
  run: StoredRun,
): number | { error: string } => {
  if (params.resumeFromStep) {
    const index = agentDefinition.steps.findIndex((step) => step.key === params.resumeFromStep);
    if (index === -1) {
      return { error: `Unknown step: ${params.resumeFromStep}` };
    }
    return index;
  }

  if (run.currentStepKey) {
    const index = agentDefinition.steps.findIndex((step) => step.key === run.currentStepKey);
    if (index >= 0) return index;
  }

  return 0;
};

export async function executeRun(
  deps: ExecutionKernelDeps,
  params: ExecuteRunParams,
): Promise<KernelRunResult> {
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

  await eventPublisher.publish(createRunStartedEvent(run.id, run.agentId, run.companyId));

  const middleware: AgentMiddleware = agentDefinition.middleware ?? createEmptyMiddleware();
  const routingRules = agentDefinition.routing ?? [];
  const skippedSteps = new Set<string>();
  const snapshot = new RunSnapshotBuilder({
    runId: run.id,
    agentId: run.agentId,
    companyId: run.companyId,
    agentVersion: agentDefinition.version,
    input: run.inputPayload as Record<string, unknown>,
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
    inputPayload: run.inputPayload as Record<string, unknown>,
  });

  const finishRun = async (
    status: string,
    creditCost: number,
    outputPayload?: Record<string, unknown>,
  ): Promise<void> => {
    await runMiddleware(middleware.afterRun, {
      runId: run.id,
      agentId: run.agentId,
      companyId: run.companyId,
      inputPayload: run.inputPayload as Record<string, unknown>,
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
  const messageStartIndex = nextAgentMessageIndex(existingBlocks.map((block) => block.messageId));

  const emitter = new BlockEmitter({
    runId: run.id,
    agentId: run.agentId,
    companyId: run.companyId,
    publisher: eventPublisher,
    blocks: deps.blocks,
    messageStartIndex,
  });

  if (messageStartIndex === 0) {
    const userInput = (run.inputPayload as { userInput?: unknown }).userInput;
    if (typeof userInput === 'string' && userInput.length > 0) {
      await emitter.userMessage(userInput);
    }
  } else if (params.formData && Object.keys(params.formData).length > 0) {
    const answerText = Object.values(params.formData).map(String).join(', ');
    if (answerText.length > 0) {
      await emitter.userMessage(answerText);
    }
  }

  const message = emitter.openMessage('assistant');
  let messageClosed = false;
  const closeMessage = async (): Promise<void> => {
    if (messageClosed) return;
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
      await eventPublisher.publish(
        createRunFailedEvent(run.id, run.agentId, run.companyId, startStepIndex.error),
      );
      await finishRun('FAILED', totalCreditCost);
      return {
        runId: run.id,
        status: 'FAILED',
        errorMessage: startStepIndex.error,
        creditCost: totalCreditCost,
      };
    }

    let currentOutput: Record<string, unknown> = {};
    const genericTextRef: { current: StreamingBlock | null } = { current: null };

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

      const stepContext = await buildStepContext({
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        stepKey: stepDef.key,
        stepIndex: i,
        inputPayload: {
          ...(run.inputPayload as Record<string, unknown>),
          ...currentOutput,
          ...(params.formData ?? {}),
        },
        previousStepsOutput,
      });

      const onChunk = (delta: string): void => {
        if (!delta) return;
        if (!genericTextRef.current) genericTextRef.current = message.text();
        genericTextRef.current.delta(delta);
      };

      const stepExecutorDeps = {
        llmProvider: deps.llmProvider,
        imageProvider: deps.imageProvider,
        message,
      };

      await runMiddleware(middleware.beforeStep, { stepContext });

      const stepResult = stubMode
        ? await executeStepStub(stepDef.key, run.agentId)
        : await executeStep(
            deps,
            agentDefinition,
            stepDef.key,
            stepContext,
            stepExecutorDeps,
            onChunk,
          );

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

          await eventPublisher.publish(
            createRunFailedEvent(
              run.id,
              run.agentId,
              run.companyId,
              debitResult.error ?? 'Unknown',
            ),
          );

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
        const completedOutputs = await runStore.getCompletedStepOutputs(run.id);
        const pausedOutput = {
          ...currentOutput,
          ...(completedOutputs.dispatch_renders ?? {}),
          ...(completedOutputs.rank_segments && !completedOutputs.dispatch_renders
            ? completedOutputs.rank_segments
            : {}),
        };

        await runStore.pauseRun({
          runId: run.id,
          pauseReason: stepResult.pauseReason,
          pauseFormSchema: stepResult.pauseFormSchema,
          creditCost: totalCreditCost,
          outputPayload: pausedOutput,
        });

        await closeMessage();

        await eventPublisher.publish(
          createRunPausedEvent(
            run.id,
            run.agentId,
            run.companyId,
            stepResult.pauseReason ?? 'Unknown',
            stepResult.pauseFormSchema,
            run.inputPayload,
            pausedOutput,
          ),
        );

        await finishRun('PAUSED', totalCreditCost, pausedOutput);
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

        await eventPublisher.publish(
          createRunFailedEvent(run.id, run.agentId, run.companyId, stepResult.error ?? 'Unknown'),
        );

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
        inputPayload: run.inputPayload as Record<string, unknown>,
        previousStepsOutput: await runStore.getCompletedStepOutputs(run.id),
        createdAt: new Date(),
      });

      if (routingRules.length > 0) {
        for (const skip of computeRoutingSkips(routingRules, stepDef.key, stepContext)) {
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

    await eventPublisher.publish(
      createRunCompletedEvent(run.id, run.agentId, run.companyId, currentOutput, totalCreditCost),
    );

    await finishRun('COMPLETED', totalCreditCost, currentOutput);

    return {
      runId: run.id,
      status: 'COMPLETED',
      outputPayload: currentOutput,
      creditCost: totalCreditCost,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      if (!messageClosed) {
        await message.error(errorMessage);
        await closeMessage();
      }
    } catch {
      // Never let block emission mask the original failure.
    }

    await runStore.failRun({
      runId: run.id,
      errorMessage,
      creditCost: totalCreditCost,
    });

    await eventPublisher.publish(
      createRunFailedEvent(run.id, run.agentId, run.companyId, errorMessage),
    );

    await finishRun('FAILED', totalCreditCost);

    return {
      runId: run.id,
      status: 'FAILED',
      errorMessage,
      creditCost: totalCreditCost,
    };
  }
}
